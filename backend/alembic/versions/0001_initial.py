"""Initial schema: portfolio, history, documents, document_chunks

Revision ID: 0001_initial
Revises:
Create Date: 2026-09-16

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "portfolio",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(length=64), nullable=True),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("equity", sa.Float(), nullable=False),
        sa.Column("debt", sa.Float(), nullable=False),
        sa.Column("others", sa.Float(), nullable=False),
        sa.Column("goals_on_track", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("goals_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_portfolio_user_id", "portfolio", ["user_id"])

    op.create_table(
        "history",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=64), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("preview", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_history_user_id", "history", ["user_id"])

    op.create_table(
        "documents",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=64), nullable=True),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("category", sa.String(length=120), nullable=False, server_default="Uploaded"),
        sa.Column("object_key", sa.String(length=768), nullable=False, unique=True),
        sa.Column("content_type", sa.String(length=120), nullable=False, server_default="application/pdf"),
        sa.Column("file_size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("pages", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="ready"),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_documents_user_id", "documents", ["user_id"])
    op.create_index("ix_documents_name", "documents", ["name"])

    op.create_table(
        "document_chunks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "document_id",
            sa.String(length=36),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("page", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("chunk_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("text", sa.Text(), nullable=False),
    )
    op.create_index("ix_document_chunks_document_id", "document_chunks", ["document_id"])


def downgrade() -> None:
    op.drop_index("ix_document_chunks_document_id", table_name="document_chunks")
    op.drop_table("document_chunks")

    op.drop_index("ix_documents_name", table_name="documents")
    op.drop_index("ix_documents_user_id", table_name="documents")
    op.drop_table("documents")

    op.drop_index("ix_history_user_id", table_name="history")
    op.drop_table("history")

    op.drop_index("ix_portfolio_user_id", table_name="portfolio")
    op.drop_table("portfolio")
