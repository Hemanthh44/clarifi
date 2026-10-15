"""Activity history — now backed by PostgreSQL instead of a raw sqlite3
connection, but with the same `add_history` / `get_history` call contract
other routers already depend on."""
from __future__ import annotations

from fastapi import APIRouter

from app.db.models import HistoryEntry
from app.db.session import session_scope

router = APIRouter(prefix="/api/history", tags=["history"])


def add_history(title: str, preview: str) -> None:
    with session_scope() as db:
        db.add(HistoryEntry(title=title, preview=preview))


def get_history() -> list[dict]:
    with session_scope() as db:
        rows = (
            db.query(HistoryEntry)
            .order_by(HistoryEntry.id.desc())
            .limit(100)
            .all()
        )
        return [
            {
                "id": str(r.id),
                "title": r.title,
                "preview": r.preview,
                "date": r.created_at.isoformat() if r.created_at else None,
                "group": "History",
            }
            for r in rows
        ]


@router.get("")
def read_history():
    return get_history()
