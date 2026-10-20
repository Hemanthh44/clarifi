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
    raw_gemini = os.getenv("GEMINI_API_KEY")
    settings.gemini_api_key = raw_gemini.strip().strip('"').strip("'") if raw_gemini else None

    raw_tavily = os.getenv("TAVILY_API_KEY")
    settings.tavily_api_key = raw_tavily.strip().strip('"').strip("'") if raw_tavily else None

    raw_db = os.getenv("DATABASE_URL")
    settings.database_url = raw_db.strip().strip('"').strip("'") if raw_db else None

    raw_supabase_url = os.getenv("SUPABASE_URL")
    if raw_supabase_url:
        cleaned_url = raw_supabase_url.strip().strip('"').strip("'")
        if cleaned_url and not cleaned_url.startswith(("http://", "https://")):
            cleaned_url = f"https://{cleaned_url}"
        settings.supabase_url = cleaned_url.rstrip("/") if cleaned_url else None
    else:
        settings.supabase_url = None

    # Keep the requested legacy variable name working while also accepting
    # Supabase's newer secret-key name when users have migrated to it.
    raw_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_SECRET_KEY")
    )
    settings.supabase_service_role_key = raw_key.strip().strip('"').strip("'") if raw_key else None

    raw_bucket = os.getenv("SUPABASE_STORAGE_BUCKET")
    settings.supabase_storage_bucket = (
        raw_bucket.strip().strip('"').strip("'") if raw_bucket else "clarifi-documents"
    )

    settings.jwt_secret = os.getenv("CLARIFI_JWT_SECRET") or os.getenv("JWT_SECRET") or ""
    if settings.jwt_secret:
        settings.jwt_secret = settings.jwt_secret.strip().strip('"').strip("'")
    else:
        # Development or unconfigured production fallback: generate a random secret.
        # Set CLARIFI_JWT_SECRET in Render Environment Variables for persistent user sessions.
        settings.jwt_secret = secrets.token_urlsafe(48)

    return settings


def reload_settings() -> Settings:
    """Clear LRU cache and re-read .env variables into Settings."""
    load_dotenv(ENV_FILE, override=True)
    get_settings.cache_clear()
    return get_settings()
