"""Signup / login / session endpoints.

ClariFi previously had no authentication at all: the frontend's Login and
Signup screens simply navigated to /dashboard, and the sidebar showed a
hardcoded "ClariFi User". This router is the real thing behind those
screens — accounts stored in PostgreSQL, PBKDF2-hashed passwords, and a
signed JWT the frontend sends as `Authorization: Bearer <token>`.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select

from app.auth.deps import get_current_user
from app.auth.security import create_access_token, hash_password, needs_rehash, verify_password
from app.db.models import User
from app.db.session import session_scope
from app.schemas import AuthResponse, LoginRequest, SignupRequest, UserPublic

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Deliberately identical for "no such email" and "wrong password" so the
# endpoint cannot be used to enumerate which emails have accounts.
_INVALID_CREDENTIALS = "Incorrect email or password."


def _public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        name=user.name,
        email=user.email,
        initials=_initials(user.name),
        created_at=user.created_at.isoformat() if user.created_at else None,
    )


def _initials(name: str) -> str:
    parts = [p for p in name.strip().split() if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest) -> AuthResponse:
    email = payload.email.strip().lower()

    with session_scope() as db:
        existing = db.scalar(select(User).where(func.lower(User.email) == email))
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Try logging in instead.",
            )

        user = User(
            id=str(uuid.uuid4()),
            name=payload.name.strip(),
            email=email,
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        db.flush()  # populate defaults before the session closes
        public = _public(user)

    token, expires_in = create_access_token(public.id)
    return AuthResponse(access_token=token, expires_in=expires_in, user=public)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> AuthResponse:
    email = payload.email.strip().lower()

    with session_scope() as db:
        user = db.scalar(select(User).where(func.lower(User.email) == email))
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_CREDENTIALS)

        # Transparently upgrade hashes written under weaker parameters.
        if needs_rehash(user.password_hash):
            user.password_hash = hash_password(payload.password)

        public = _public(user)

    token, expires_in = create_access_token(public.id)
    return AuthResponse(access_token=token, expires_in=expires_in, user=public)


@router.get("/me", response_model=UserPublic)
def me(user: dict = Depends(get_current_user)) -> UserPublic:
    """Used by the frontend on boot to restore a session from a stored token."""
    return UserPublic(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        initials=_initials(user["name"]),
        created_at=user.get("created_at"),
    )
