"""Portfolio persistence — now backed by PostgreSQL (via app/db/) instead of
the local SQLite file this module used to own directly.

Kept at this import path (`app.data.database`) and with the same function
signatures (`init_db`, `get_portfolio`, `save_portfolio`) on purpose: several
routers and agents already import from here, and this migration is meant to
change *where* the data lives, not the internal call contracts.
"""
from __future__ import annotations

from app.config import get_settings
from app.db.models import Portfolio
from app.db.session import Base, get_engine, session_scope


def init_db() -> None:
    """Schema is owned by Alembic in production — run `alembic upgrade
    head` before starting the app (see backend/README.md). This is kept as
    a safety net only for the local SQLite dev fallback (no DATABASE_URL
    set), so a fresh checkout still runs without a manual migration step.
    """
    from app.db.session import _is_placeholder_url
    if _is_placeholder_url(get_settings().database_url):
        Base.metadata.create_all(get_engine())


def get_portfolio() -> dict | None:
    with session_scope() as db:
        row = db.get(Portfolio, 1)
        if not row:
            return None
        return {
            "value": row.value,
            "equity": row.equity,
            "debt": row.debt,
            "others": row.others,
            "goals_on_track": row.goals_on_track,
            "goals_total": row.goals_total,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }


def save_portfolio(
    value: float,
    equity: float,
    debt: float,
    others: float,
    goals_on_track: int = 0,
    goals_total: int = 0,
) -> dict:
    with session_scope() as db:
        row = db.get(Portfolio, 1)
        if row is None:
            row = Portfolio(
                id=1,
                value=value,
                equity=equity,
                debt=debt,
                others=others,
                goals_on_track=goals_on_track,
                goals_total=goals_total,
            )
            db.add(row)
        else:
            row.value = value
            row.equity = equity
            row.debt = debt
            row.others = others
            row.goals_on_track = goals_on_track
            row.goals_total = goals_total
    result = get_portfolio()
    assert result is not None  # we just wrote it
    return result
