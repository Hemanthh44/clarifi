"""ORM models for ClariFi's persistent application data.

`user_id` columns exist on every table. Rows created before ClariFi had
authentication still have user_id = NULL, and are treated as the shared
legacy workspace; rows created by a signed-in user carry that user's id.
See the "User data isolation" note in README.md for how to backfill and
tighten this into a NOT NULL foreign key once no legacy rows remain.
"""
from __future__ import annotations

import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Portfolio(Base):
    __tablename__ = "portfolio"

    # Single-row table today (id is always 1), same as the previous SQLite
    # schema. See the user_id note above for how this extends per-user.
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    value: Mapped[float] = mapped_column(nullable=False)
    equity: Mapped[float] = mapped_column(nullable=False)
    debt: Mapped[float] = mapped_column(nullable=False)
    others: Mapped[float] = mapped_column(nullable=False)
    goals_on_track: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    goals_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class HistoryEntry(Base):
    __tablename__ = "history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    preview: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Document(Base):
    """Metadata for one uploaded document. The file bytes themselves live in
    Supabase Storage (see app/storage/supabase_storage.py) — only `object_key` is stored here."""

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # uuid4
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(120), nullable=False, default="Uploaded")
    object_key: Mapped[str] = mapped_column(String(768), nullable=False, unique=True)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False, default="application/pdf")
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pages: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # "processing" | "ready" | "failed" — reserved for a future async
    # ingestion pipeline; the current synchronous upload flow always writes
    # "ready" once chunking succeeds.
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="ready")
    uploaded_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ML-predicted financial document category (see app/ml/document_classifier.py),
    # computed once at upload time. Nullable/optional so older rows (from
    # before this column existed) just don't show a predicted category —
    # nothing re-derives it retroactively.
    predicted_category: Mapped[str | None] = mapped_column(String(120), nullable=True)
    predicted_confidence: Mapped[float | None] = mapped_column(nullable=True)

    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan", passive_deletes=True
    )


class DocumentChunk(Base):
    """One citation-preserving chunk of a document's extracted text, used to
    rebuild the in-memory RAG index (see app/rag/ingest.py) after a restart
    without needing the original file to still be on local disk."""

    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    page: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    document: Mapped["Document"] = relationship(back_populates="chunks")


class User(Base):
    """A registered ClariFi account.

    `password_hash` is a PBKDF2-HMAC-SHA256 digest produced by
    app/auth/security.py — never a plaintext or reversibly-encrypted
    password. `email` is stored lowercased and is the login identifier.
    """

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # uuid4
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
