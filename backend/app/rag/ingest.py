"""Rebuilds the in-memory TF-IDF search index from documents/chunks
persisted in PostgreSQL.

The vector store itself stays in-memory for speed (unchanged), but its
source of truth is now the database instead of files on local disk — so a
Render redeploy (which wipes local disk) no longer loses the RAG corpus.
There is intentionally no bundled demo corpus; only user uploads.
"""
from __future__ import annotations

from app.db.models import Document, DocumentChunk
from app.db.session import session_scope
from app.rag.chunker import Chunk
from app.rag.vector_store import DocumentRecord, get_vector_store


def _load_chunks_and_documents() -> tuple[list[Chunk], dict[str, DocumentRecord]]:
    chunks: list[Chunk] = []
    documents: dict[str, DocumentRecord] = {}

    with session_scope() as db:
        docs = db.query(Document).all()
        doc_names = {}
        doc_categories = {}
        for doc in docs:
            doc_names[doc.id] = doc.name
            doc_categories[doc.id] = doc.category
            documents[doc.id] = DocumentRecord(
                id=doc.id,
                name=doc.name,
                category=doc.category,
                pages=doc.pages,
                indexed=doc.status == "ready",
            )

        rows = (
            db.query(DocumentChunk)
            .order_by(DocumentChunk.document_id, DocumentChunk.chunk_index)
            .all()
        )
        for row in rows:
            chunks.append(
                Chunk(
                    doc=doc_names.get(row.document_id, row.document_id),
                    category=doc_categories.get(row.document_id, "Uploaded"),
                    page=row.page,
                    text=row.text,
                )
            )

    return chunks, documents


def rebuild_index_from_db() -> None:
    """Recompute the in-memory TF-IDF index from PostgreSQL. Call this
    whenever a document is uploaded or deleted, and once at startup."""
    chunks, documents = _load_chunks_and_documents()
    get_vector_store().load(chunks, documents)


def ingest_startup_corpus() -> None:
    """Kept under its original name — app/main.py's lifespan hook calls
    this on startup and doesn't need to know it now reads from Postgres
    instead of a local uploads directory."""
    rebuild_index_from_db()
