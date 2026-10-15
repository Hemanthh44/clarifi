"""SQLAlchemy engine + session management.

Production (Render, etc.) always sets DATABASE_URL to a real PostgreSQL
connection string. When it's unset — a bare local checkout with no .env —
we fall back to a local SQLite file purely so the app is still runnable
for a quick look; nothing about that fallback is used in deployment, and
it's not a substitute for running the real Postgres schema. Set
DATABASE_URL (see backend/.env.example) and run `alembic upgrade head`
for anything beyond a quick local smoke test.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

logger = logging.getLogger("clarifi.db")


class Base(DeclarativeBase):
    pass


def _is_placeholder_url(url: str | None) -> bool:
    if not url:
        return True
    placeholders = ["<PROJECT-REF>", "<PASSWORD>", "<SESSION-POOLER-HOST>", "your_server_secret_key"]
    return any(p in url for p in placeholders)


def _local_dev_fallback_url() -> str:
    logger.warning(
        "DATABASE_URL is not set or contains placeholders — falling back to a local SQLite file "
        "(clarifi_dev.db) for development. Set DATABASE_URL to a real "
        "PostgreSQL connection string before deploying."
    )
    return "sqlite:///./clarifi_dev.db"


def _normalized_database_url() -> str:
    settings = get_settings()
    url = settings.database_url
    if _is_placeholder_url(url):
        if settings.environment.lower() == "production":
            raise RuntimeError("DATABASE_URL is required when CLARIFI_ENVIRONMENT=production")
        return _local_dev_fallback_url()

    # Render (and several other hosts) hand out "postgres://..." URLs, but
    # SQLAlchemy 2.x + psycopg need an explicit driver in the scheme.
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


_engine = None
_SessionLocal: sessionmaker | None = None


def get_engine():
    global _engine
    if _engine is None:
        url = _normalized_database_url()
        connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
        _engine = create_engine(url, pool_pre_ping=True, future=True, connect_args=connect_args)
    return _engine


def get_sessionmaker() -> sessionmaker:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, future=True)
    return _SessionLocal


@contextmanager
def session_scope() -> Iterator[Session]:
    """Transactional scope for a single unit of work.

    with session_scope() as db:
        db.add(...)
    # committed on success, rolled back on any exception.
    """
    session = get_sessionmaker()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def check_connection() -> bool:
    """Used by GET /api/health so Render's health check can confirm the
    database is actually reachable, without leaking credentials."""
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Database connectivity check failed: %s", exc)
        return False
