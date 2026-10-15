"""Password hashing and JWT issuing/verification for ClariFi.

Deliberately standard-library only (hashlib / hmac / secrets / base64), for
the same reason app/rag/embeddings.py and app/ml/document_classifier.py
avoid heavyweight dependencies: nothing extra to install, nothing to pin,
and every step is inspectable.

Password storage uses PBKDF2-HMAC-SHA256 with a per-password random salt
and a high iteration count. Tokens are HS256 JWTs signed with
CLARIFI_JWT_SECRET. Both are standard constructions, but note the
trade-off recorded in backend/README.md: PBKDF2 is a reasonable,
FIPS-blessed KDF, while argon2id or bcrypt are the stronger modern
choices if you are willing to add a dependency.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time

from app.config import get_settings

# OWASP's floor for PBKDF2-HMAC-SHA256 is 600k iterations (2023 guidance).
_PBKDF2_ITERATIONS = 600_000
_PBKDF2_ALGORITHM = "pbkdf2_sha256"
_SALT_BYTES = 16


# ---------------------------------------------------------------- passwords

def hash_password(password: str) -> str:
    """Return a self-describing hash: pbkdf2_sha256$<iters>$<salt>$<hash>."""
    salt = secrets.token_bytes(_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return "$".join(
        [
            _PBKDF2_ALGORITHM,
            str(_PBKDF2_ITERATIONS),
            base64.b64encode(salt).decode("ascii"),
            base64.b64encode(digest).decode("ascii"),
        ]
    )


def verify_password(password: str, encoded: str) -> bool:
    """Constant-time verification against a stored hash."""
    try:
        algorithm, iterations, salt_b64, digest_b64 = encoded.split("$")
        if algorithm != _PBKDF2_ALGORITHM:
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
    except (ValueError, TypeError):
        return False

    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
    return hmac.compare_digest(candidate, expected)


def needs_rehash(encoded: str) -> bool:
    """True when a stored hash used fewer iterations than we now require."""
    try:
        algorithm, iterations, _, _ = encoded.split("$")
    except ValueError:
        return True
    return algorithm != _PBKDF2_ALGORITHM or int(iterations) < _PBKDF2_ITERATIONS


# -------------------------------------------------------------------- JWT

def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(segment: str) -> bytes:
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment + padding)


def _signing_key() -> bytes:
    return get_settings().jwt_secret.encode("utf-8")


def create_access_token(subject: str, expires_in_seconds: int | None = None) -> tuple[str, int]:
    """Issue an HS256 JWT for `subject` (the user id).

    Returns (token, expires_in_seconds) so the client can schedule a
    re-login rather than discovering expiry through a failed request.
    """
    settings = get_settings()
    ttl = expires_in_seconds or settings.jwt_expire_seconds
    issued_at = int(time.time())

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": subject, "iat": issued_at, "exp": issued_at + ttl}

    signing_input = ".".join(
        [
            _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8")),
            _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")),
        ]
    )
    signature = hmac.new(_signing_key(), signing_input.encode("ascii"), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url_encode(signature)}", ttl


def decode_access_token(token: str) -> dict | None:
    """Verify signature + expiry. Returns the claims, or None if invalid."""
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError:
        return None

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected = hmac.new(_signing_key(), signing_input, hashlib.sha256).digest()

    try:
        provided = _b64url_decode(signature_b64)
    except Exception:
        return None

    if not hmac.compare_digest(expected, provided):
        return None

    try:
        claims = json.loads(_b64url_decode(payload_b64))
    except Exception:
        return None

    if not isinstance(claims, dict) or "sub" not in claims:
        return None
    if int(claims.get("exp", 0)) <= int(time.time()):
        return None

    return claims
