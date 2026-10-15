"""Startup-safe schema migration.

The deploy's start command (`alembic upgrade head && uvicorn ...`, see
render.yaml) should normally be what brings the schema up to date. This
module is a defensive second layer for exactly the failure mode that once
caused a "relation does not exist" crash in production: a Start Command on
the hosting dashboard that's drifted from render.yaml (e.g. a service
created by hand before the alembic step existed, so git pushes never
change it). Rather than silently serving traffic against an empty
database, the app brings its own schema up to date in-process before it
starts accepting requests.

This does not replace running `alembic upgrade head` from the deploy
command — that's still the right primary path and keeps migration output
visible in the build/deploy logs. This is a safety net, not a redundancy
to rely on.
"""
from __future__ import annotations

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config

logger = logging.getLogger("clarifi.db")

# backend/app/db/migrate.py -> backend/
_BACKEND_DIR = Path(__file__).resolve().parents[2]


def run_migrations() -> bool:
    """Run `alembic upgrade head` in-process. Returns True on success.

    Safe to call on every startup: Alembic tracks the current revision in
    the database itself, so this is a no-op once the schema is current.
    """
    try:
        cfg = Config(str(_BACKEND_DIR / "alembic.ini"))
        cfg.set_main_option("script_location", str(_BACKEND_DIR / "alembic"))
        command.upgrade(cfg, "head")
        logger.info("Database schema is up to date (alembic upgrade head).")
        return True
    except Exception:
        logger.exception(
            "alembic upgrade head failed at startup — the database schema may be "
            "missing or out of date. Check DATABASE_URL and run migrations manually."
        )
        return False
