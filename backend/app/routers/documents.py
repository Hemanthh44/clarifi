"""Document upload/list/delete.

Flow: validate -> upload the original file bytes to Supabase Storage -> store
document metadata + extracted/chunked text in PostgreSQL -> rebuild the
in-memory RAG index from the database. Nothing here writes to local disk,
so uploads survive a Render redeploy (where local disk is ephemeral) as
long as Supabase Storage + PostgreSQL are configured.
"""
from __future__ import annotations

import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import get_settings
from app.db.models import Document, DocumentChunk
from app.db.session import session_scope
from app.ml.document_classifier import classify_document
from app.rag.chunker import parse_uploaded_pdf, parse_uploaded_text
from app.rag.ingest import rebuild_index_from_db
from app.schemas import DocumentListResponse, DocumentMeta
from app.storage.supabase_storage import StorageError, build_object_key, delete_object, upload_bytes

logger = logging.getLogger("clarifi.documents")

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}


@router.get("", response_model=DocumentListResponse)
def list_documents() -> DocumentListResponse:
    with session_scope() as db:
        rows = db.query(Document).order_by(Document.uploaded_at.desc()).all()
        docs = [
            DocumentMeta(
                id=r.id,
                name=r.name,
                category=r.category,
                pages=r.pages,
                indexed=r.status == "ready",
                ml_category=r.predicted_category,
                ml_confidence=r.predicted_confidence,
            )
            for r in rows
        ]
    return DocumentListResponse(documents=docs)


@router.post("", response_model=DocumentMeta)
async def upload_document(file: UploadFile = File(...), category: str = Form("Uploaded")) -> DocumentMeta:
    settings = get_settings()
    content = await file.read()

    if not content:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")

    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_upload_mb:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_mb}MB limit")

    # Only trust the final path segment of the client-supplied filename —
    # never a user-controlled path — and validate the extension before
    # doing any parsing or upload work.
    original_name = Path(file.filename or "uploaded_document").name
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Only PDF, TXT, and MD files are supported")

    if suffix == ".pdf":
        try:
            chunks = parse_uploaded_pdf(content, original_name, category=category)
        except Exception as exc:  # pragma: no cover - defensive, malformed PDFs
            logger.warning("Failed to parse uploaded PDF %s: %s", original_name, exc)
            raise HTTPException(
                status_code=422,
                detail="Couldn't read this PDF. It may be corrupted or scanned as images only.",
            ) from exc
    else:
        chunks = parse_uploaded_text(content.decode("utf-8", errors="ignore"), original_name, category=category)

    if not chunks:
        raise HTTPException(status_code=422, detail="Couldn't extract any readable text from this file")

    # Run the ML category classifier on the extracted text (see
    # app/ml/document_classifier.py) before we touch storage/DB, so an
    # unlucky classifier error can't corrupt an otherwise-successful upload.
    combined_text = "\n".join(c.text for c in chunks)
    try:
        ml_category, ml_confidence = classify_document(combined_text)
    except Exception:  # pragma: no cover - defensive, classification is best-effort
        logger.exception("Document category classifier failed for %s; continuing without a prediction.", original_name)
        ml_category, ml_confidence = None, None

    document_id = str(uuid.uuid4())
    object_key = build_object_key(document_id, original_name)
    content_type = file.content_type or ("application/pdf" if suffix == ".pdf" else "text/plain")

    try:
        upload_bytes(object_key, content, content_type=content_type)
    except StorageError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    pages = max((c.page for c in chunks), default=1)

    with session_scope() as db:
        # Re-uploading the same filename replaces the previous document —
        # same behavior the app had when it kept one file per filename on
        # local disk.
        existing = db.query(Document).filter(Document.name == original_name).first()
        superseded_key: str | None = None
        if existing:
            superseded_key = existing.object_key
            db.delete(existing)
            db.flush()

        record = Document(
            id=document_id,
            name=original_name,
            category=category,
            object_key=object_key,
            content_type=content_type,
            file_size=len(content),
            pages=pages,
            status="ready",
            predicted_category=ml_category,
            predicted_confidence=ml_confidence,
        )
        db.add(record)
        db.flush()
        for index, chunk in enumerate(chunks):
            db.add(DocumentChunk(document_id=document_id, page=chunk.page, chunk_index=index, text=chunk.text))

    if superseded_key:
        try:
            delete_object(superseded_key)
        except StorageError:
            logger.warning("Could not delete superseded Supabase Storage object %s; continuing.", superseded_key)

    rebuild_index_from_db()
    return DocumentMeta(
        id=document_id,
        name=original_name,
        category=category,
        pages=pages,
        indexed=True,
        ml_category=ml_category,
        ml_confidence=ml_confidence,
    )


@router.delete("/{document_id}")
def delete_document(document_id: str) -> dict:
    with session_scope() as db:
        record = db.get(Document, document_id)
        if not record:
            raise HTTPException(status_code=404, detail="Document not found")
        object_key = record.object_key
        db.delete(record)

    try:
        delete_object(object_key)
    except StorageError as exc:
        # Metadata is already gone from PostgreSQL; don't fail the request
        # over a storage cleanup issue, but keep it in the logs for ops.
        logger.warning("Supabase Storage delete failed for document %s (%s): %s", document_id, object_key, exc)

    rebuild_index_from_db()
    return {"deleted": True, "document_id": document_id}
