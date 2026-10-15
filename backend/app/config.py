from functools import lru_cache
from pathlib import Path
import os
import secrets

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load the backend/.env file relative to this file, rather than the
# terminal's current working directory. This prevents API keys from appearing
# as "missing" when uvicorn is started from the project root.
BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"
load_dotenv(ENV_FILE, override=True)


class Settings(BaseSettings):
    """Central configuration for the ClariFi backend."""

    model_config = SettingsConfigDict(
        env_prefix="CLARIFI_",
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "development"
    llm_model: str = "gemini-3.5-flash-lite"
    frontend_origin: str = "http://localhost:5173"
    max_upload_mb: int = 25
    retrieval_top_k: int = 4
    tavily_max_results: int = 6

    # Provider credentials / connection strings intentionally remain unprefixed
    # so the same names work locally and on Render.
    gemini_api_key: str | None = None
    tavily_api_key: str | None = None
    database_url: str | None = None

    # Supabase Storage. These values are server-side only and must never be
    # exposed through Vite or committed to source control.
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_storage_bucket: str = "clarifi-documents"

    # Auth. jwt_secret MUST be set to a long random value in production —
    # get_settings() below refuses to start without it. Tokens are short
    # lived by default (12h) because ClariFi has no refresh-token flow yet.
    jwt_secret: str = ""
    jwt_expire_seconds: int = 60 * 60 * 12


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.gemini_api_key = os.getenv("GEMINI_API_KEY") or None
    settings.tavily_api_key = os.getenv("TAVILY_API_KEY") or None
    settings.database_url = os.getenv("DATABASE_URL") or None
    settings.supabase_url = os.getenv("SUPABASE_URL") or None
    # Keep the requested legacy variable name working while also accepting
    # Supabase's newer secret-key name when users have migrated to it.
    settings.supabase_service_role_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_SECRET_KEY")
        or None
    )
    settings.supabase_storage_bucket = (
        os.getenv("SUPABASE_STORAGE_BUCKET") or "clarifi-documents"
    )

    settings.jwt_secret = os.getenv("CLARIFI_JWT_SECRET") or os.getenv("JWT_SECRET") or ""
    if not settings.jwt_secret:
        if settings.environment.lower() == "production":
            raise RuntimeError(
                "CLARIFI_JWT_SECRET is required when CLARIFI_ENVIRONMENT=production. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )
        # Development only: a per-process secret. Restarting the server
        # invalidates existing sessions, which is the intended nudge to set
        # a real secret rather than a silent insecure default.
        settings.jwt_secret = secrets.token_urlsafe(48)

    return settings
