"""Add users table (authentication)

Revision ID: 0003_users
Revises: 0002_document_ml_category
Create Date: 2026-09-17

Introduces real accounts. The existing `user_id` columns on portfolio,
history and documents stay nullable: rows created before this migration
belong to no account and remain readable as the shared legacy workspace.
No foreign key is added yet for the same reason — see app/db/models.py.
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_users"
down_revision: Union[str, None] = "0002_document_ml_category"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
