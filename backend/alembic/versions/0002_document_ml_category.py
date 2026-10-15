"""Add predicted_category / predicted_confidence to documents (ML classifier)

Revision ID: 0002_document_ml_category
Revises: 0001_initial
Create Date: 2026-09-17

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_document_ml_category"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("predicted_category", sa.String(length=120), nullable=True))
    op.add_column("documents", sa.Column("predicted_confidence", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("documents", "predicted_confidence")
    op.drop_column("documents", "predicted_category")
