import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.data.database import init_db
from app.db.migrate import run_migrations
from app.db.session import check_connection
from app.rag.ingest import ingest_startup_corpus
from app.routers import ask, auth, documents, history, image, ml, portfolio, product_explainer, risk, scam

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clarifi")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    if check_connection():
        # Defensive second layer — see app/db/migrate.py. The deploy's start
        # command running `alembic upgrade head` first is still the primary
        # path; this just stops a drifted Start Command from leaving the
        # app silently serving traffic against an empty schema.
        run_migrations()
        try:
            ingest_startup_corpus()
        except Exception:  # pragma: no cover - defensive, keeps the API up
            logger.exception("Failed to rebuild the RAG index from the database on startup.")
    else:
        logger.warning(
            "Database is not reachable at startup — Ask ClariFi, Portfolio, History, and "
            "Documents will return errors until PostgreSQL is available. Check DATABASE_URL."
        )

    settings = get_settings()
    mode = "LLM-assisted" if settings.gemini_api_key else "template mode (no GEMINI_API_KEY set)"
    logger.info("ClariFi backend ready — running in %s.", mode)
    yield


app = FastAPI(
    title="ClariFi API",
    description=(
        "Multi-agent financial co-pilot backend: an Orchestrator Agent routes requests to a "
        "RAG-grounded Product Explainer, a deterministic Risk Simulator, a Summary Agent, and a "
        "pattern-based Scam Screener, all behind a shared Compliance & Explainability Guardrail."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()

def _allowed_origins() -> list[str]:
    configured = [origin.strip().rstrip("/") for origin in settings.frontend_origin.split(",") if origin.strip()]
    local = [
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
        "http://localhost:5176", "http://127.0.0.1:5176",
        "http://localhost:3000", "http://127.0.0.1:3000",
    ]
    return list(dict.fromkeys(configured + local))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(ask.router)
app.include_router(product_explainer.router)
app.include_router(risk.router)
app.include_router(scam.router)
app.include_router(portfolio.router)
app.include_router(documents.router)
app.include_router(history.router)
app.include_router(ml.router)
app.include_router(image.router)


@app.get("/api/health")
def health() -> dict:
    settings = get_settings()
    from app.storage.supabase_storage import is_configured as storage_configured

    database_ok = check_connection()
    storage_ok = storage_configured()
    payload = {
        "status": "ok" if database_ok and storage_ok else "degraded",
        "llm_mode": "live" if settings.gemini_api_key else "template",
        "web_search": "configured" if settings.tavily_api_key else "not_configured",
        "database": "connected" if database_ok else "unreachable",
        "object_storage": "configured" if storage_ok else "not_configured",
    }
    # In development, local SQLite and the local document-storage fallback
    # make the app usable without provisioning external services. Production
    # still returns 503 when PostgreSQL or Supabase Storage is missing so Render health
    # checks cannot mark an incompletely configured service as healthy.
    if settings.environment.lower() == "production" and (not database_ok or not storage_ok):
        raise HTTPException(status_code=503, detail=payload)
    return payload
