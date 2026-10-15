"""Persistent-on-disk document index used by ClariFi's Product Explainer.

The application keeps the searchable TF-IDF matrix in memory for speed, while
user-uploaded source files remain on disk and are re-indexed at startup.  The
store exposes document IDs separately from filenames so API callers can safely
refer to an uploaded document by ID.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass

import numpy as np

from app.rag.chunker import Chunk
from app.rag.embeddings import TfidfVectorizer, cosine_similarity


@dataclass
class DocumentRecord:
    id: str
    name: str
    category: str
    pages: int
    indexed: bool = True


class VectorStore:
    def __init__(self) -> None:
        self.chunks: list[Chunk] = []
        self.vectorizer = TfidfVectorizer()
        self.matrix: np.ndarray | None = None
        self.documents: dict[str, DocumentRecord] = {}

    @staticmethod
    def document_id(doc_name: str) -> str:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, f"clarifi-document:{doc_name}"))

    def build(self, chunks: list[Chunk]) -> None:
        self.chunks = chunks
        texts = [c.text for c in chunks]
        self.matrix = self.vectorizer.fit_transform(texts) if texts else None

        self.documents = {}
        for c in chunks:
            doc_id = self.document_id(c.doc)
            record = self.documents.setdefault(
                doc_id,
                DocumentRecord(
                    id=doc_id,
                    name=c.doc,
                    category=c.category,
                    pages=0,
                ),
            )
            record.pages = max(record.pages, c.page)

    def load(self, chunks: list[Chunk], documents: dict[str, DocumentRecord]) -> None:
        """Rebuild the index from chunks + document records that already
        carry their real (database-issued) IDs, instead of deriving an ID
        from the filename. Used by app/rag/ingest.py, whose source of
        truth is PostgreSQL rather than local filenames."""
        self.chunks = chunks
        texts = [c.text for c in chunks]
        self.matrix = self.vectorizer.fit_transform(texts) if texts else None
        self.documents = documents

    def add_document(self, chunks: list[Chunk]) -> DocumentRecord:
        """Replace an existing upload with the same filename, then rebuild."""
        if not chunks:
            raise ValueError("Cannot index an empty document")
        doc_name = chunks[0].doc
        remaining = [c for c in self.chunks if c.doc != doc_name]
        self.build(remaining + chunks)
        return self.documents[self.document_id(doc_name)]

    def get_document_name(self, document_id: str) -> str | None:
        record = self.documents.get(document_id)
        return record.name if record else None

    def search(
        self,
        query: str,
        top_k: int = 4,
        document_filter: str | None = None,
    ) -> list[dict]:
        if not self.chunks or self.matrix is None or not query.strip():
            return []

        # API callers use the stable document UUID; internally chunks use names.
        doc_name = self.get_document_name(document_filter) if document_filter else None
        if document_filter and not doc_name:
            # Backwards compatibility: allow an exact filename as a filter too.
            doc_name = document_filter if any(c.doc == document_filter for c in self.chunks) else None
            if not doc_name:
                return []

        query_vec = self.vectorizer.transform([query])[0]
        scores = cosine_similarity(query_vec, self.matrix)
        ranked_indices = np.argsort(-scores)

        results = []
        for idx in ranked_indices:
            chunk = self.chunks[int(idx)]
            if doc_name and chunk.doc != doc_name:
                continue
            score = float(scores[int(idx)])
            if score <= 0:
                continue
            results.append(
                {
                    "doc": chunk.doc,
                    "category": chunk.category,
                    "page": chunk.page,
                    "text": chunk.text,
                    "score": round(score, 4),
                }
            )
            if len(results) >= top_k:
                break
        return results

    def representative(
        self,
        document_filter: str,
        limit: int = 10,
    ) -> list[dict]:
        """Return evenly distributed chunks from a document.

        This is intentionally used for whole-document actions such as Summary,
        where semantic similarity to the word "summarize" is not meaningful.
        """
        doc_name = self.get_document_name(document_filter)
        if not doc_name:
            return []

        doc_chunks = [c for c in self.chunks if c.doc == doc_name]
        if not doc_chunks:
            return []

        limit = max(1, min(limit, len(doc_chunks)))
        if limit == len(doc_chunks):
            selected = doc_chunks
        else:
            positions = np.linspace(0, len(doc_chunks) - 1, num=limit, dtype=int)
            selected = [doc_chunks[int(i)] for i in positions]

        return [
            {
                "doc": c.doc,
                "category": c.category,
                "page": c.page,
                "text": c.text,
                "score": 1.0,
            }
            for c in selected
        ]

    def list_documents(self) -> list[DocumentRecord]:
        return list(self.documents.values())


_store: VectorStore | None = None


def get_vector_store() -> VectorStore:
    global _store
    if _store is None:
        _store = VectorStore()
    return _store
