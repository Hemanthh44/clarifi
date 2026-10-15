"""FastAPI dependencies for resolving the authenticated user."""
from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status

from app.auth.security import decode_access_token
from app.db.models import User
from app.db.session import session_scope


def _bearer_token(request: Request) -> str | None:
    header = request.headers.get("Authorization") or ""
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def _load_user(token: str) -> dict | None:
    claims = decode_access_token(token)
    if not claims:
        return None

    with session_scope() as db:
        user = db.get(User, claims["sub"])
        if user is None:
            return None
        # Detach into a plain dict — the Session closes when this scope exits.
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }


def get_optional_user(request: Request) -> dict | None:
    """Resolve the caller if they sent a valid token, else None.

    Used by endpoints that must keep working for anonymous callers — see
    the migration note in app/db/models.py about pre-auth rows whose
    user_id is NULL.
    """
    token = _bearer_token(request)
    if not token:
        return None
    return _load_user(token)


def get_current_user(user: dict | None = Depends(get_optional_user)) -> dict:
    """Require a valid token; 401 otherwise."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Log in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
