"""Alembic environment.

Reads the real connection string from DATABASE_URL (via app.config /
app.db.session) rather than from alembic.ini, so the same env vars used to
run the app also drive migrations — no credentials duplicated in this repo.
"""
from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make sure `app.*` is importable regardless of the working directory
# Alembic was invoked from.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import models  # noqa: F401  (import registers models on Base.metadata)
from app.db.session import Base, _normalized_database_url  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override whatever alembic.ini has with the real, env-driven URL.
# Escape % to %% so configparser doesn't fail on URL-encoded password characters.
config.set_main_option("sqlalchemy.url", _normalized_database_url().replace("%", "%%"))

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (`alembic upgrade head --sql`)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection (the normal path)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
