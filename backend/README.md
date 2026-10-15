# ClariFi Backend

The multi-agent, RAG, and risk-engine backend behind ClariFi, implementing
the architecture described in the project abstract: a central
**Orchestrator Agent** routes each request to a specialist — **Product
Explainer**, **Risk Simulator**, **Summary Agent**, or **Scam
Screener** — and every response passes through a shared **Compliance &
Explainability Guardrail**.

## Design principle: the LLM never computes numbers

Risk scores, stress-test impacts, and fraud-detection scores are all
produced by plain deterministic Python (`app/risk_engine/`,
`app/scam/`) — never by the language model. The LLM (`app/llm/client.py`)
is used only for two things: lightweight intent classification in the
Orchestrator, and narrating plain-language explanations around numbers
the engines already computed. This is the design choice the source PDF
calls out as removing "the largest hallucination risk in financial
GenAI."

**The backend uses real user-provided documents and deterministic financial calculations.** `GEMINI_API_KEY` enables richer grounded narration and intent classification; the core retrieval and risk engines remain usable without it.

## Architecture

```
Frontend (React)
      │
      ▼
FastAPI routers (app/routers/)
      │
      ▼
Orchestrator Agent (app/agents/orchestrator.py)
      │  classifies intent, routes to one specialist
      ├─→ Web Research       → Tavily live search → source ranking → LLM narration
      ├─→ Product Explainer  → RAG retrieval (app/rag/) → LLM narration
      ├─→ Risk Simulator     → deterministic risk engine (app/risk_engine/)
      ├─→ Summary Agent      → risk engine + LLM narration
      └─→ Scam Screener      → deterministic pattern matcher (app/scam/)
      │
      ▼
Compliance & Explainability Guardrail (app/compliance/)
      │  strips buy/sell language, attaches disclaimer + explainability flags
      ▼
Response back to frontend
```

## RAG pipeline

- `app/rag/chunker.py` — extracts and splits uploaded PDFs/text into citation-ready chunks (`doc`, `page`, `text`).
- `app/rag/embeddings.py` — a dependency-light TF-IDF vectorizer with
  cosine similarity. No model download, no API call, fully
  deterministic — swap for a real embedding model later without
  touching `retriever.py`.
- `app/rag/vector_store.py` — in-memory searchable index. It's rebuilt from PostgreSQL (`documents` + `document_chunks` tables) at startup and after every upload/delete, so it survives a Render redeploy even though it lives in memory while running.
- `app/rag/ingest.py` — the bridge between Postgres and the in-memory index (`rebuild_index_from_db`).
- No financial documents are bundled. The knowledge base starts empty and only files explicitly uploaded by the user are indexed.

## ML document category classifier

`app/ml/document_classifier.py` predicts a financial document category
(Mutual Fund, Insurance, Fixed Deposit, Loan/Credit, Stocks & Brokerage,
Tax Document, Retirement/Pension, Bank Statement, or Other) for every
uploaded document, shown as a small badge in the Documents and Product
Explainer pages.

It's a **nearest-centroid classifier over TF-IDF features** — the same
dependency-light approach as the RAG retriever above, not a hosted model:

1. A small labeled seed corpus (a handful of representative sentences per
   category, right in the module) is vectorized with the same
   `TfidfVectorizer` used for RAG.
2. Each category's example vectors are averaged into a single centroid.
3. An uploaded document's extracted text is projected into that same
   TF-IDF space and assigned to whichever centroid it's closest to
   (cosine similarity), with that similarity reported back as a 0-1
   confidence.
4. Below a calibrated confidence floor (0.20 — noise/unrelated text
   empirically lands under 0.14, genuine matches land at 0.4+), the
   prediction is reported as "Other" rather than a low-confidence guess.

This trains itself in-process on first use (no separate training step, no
model weights to ship) and is fully deterministic and inspectable — edit
`TRAINING_EXAMPLES` in the module to add more categories or improve
accuracy. It's a best-effort suggestion only: nothing in the upload flow
is blocked or changed by the prediction, and the existing `category`
field (which page/feature uploaded the document) is untouched.

## Persistence architecture

| Data | Where it lives | Notes |
|---|---|---|
| Portfolio, goals | PostgreSQL (`portfolio` table) | Single row today — see "User data isolation" below |
| History | PostgreSQL (`history` table) | Starts empty, never seeded |
| Document metadata (name, category, pages, object key, status) | PostgreSQL (`documents` table) | |
| Document chunk text (for RAG) | PostgreSQL (`document_chunks` table) | Rebuilt into an in-memory TF-IDF index at startup |
| Original uploaded file bytes (PDF/TXT/MD) | Supabase Storage | Never touches local disk; key stored in `documents.object_key` |

### User data isolation

There is currently no authentication in ClariFi. `user_id` columns exist on
every table (`portfolio`, `history`, `documents`) but are always `NULL` —
there is exactly one shared portfolio and one shared document library, the
same behavior the app had with local SQLite/disk. This is a real limitation,
not something to paper over: **do not treat this deployment as
multi-tenant-safe.** Adding auth later means adding a login flow, populating
`user_id` on write, and filtering every query by it — the schema doesn't need
to change.

## Running it locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt
cp .env.example .env        # fill in DATABASE_URL, SUPABASE_*, GEMINI_API_KEY, TAVILY_API_KEY
alembic upgrade head        # create the schema (see "Database migrations" below)
uvicorn app.main:app --reload --port 8000
```

If `DATABASE_URL` is left unset, the backend falls back to a local SQLite
file (`clarifi_dev.db`) purely so you can look around without standing up
Postgres first — this is a dev convenience only, not how it runs in
production.

Then point the frontend's `VITE_API_URL` at `http://localhost:8000` if you are not using the default localhost endpoint. The frontend calls the FastAPI routes through `src/lib/api.js`.

Interactive API docs: `http://localhost:8000/docs`

## Database migrations (Alembic)

Schema changes are managed with Alembic — the app never creates or alters
tables on its own against a real database.

```bash
# Create the schema on a fresh database (local or Render):
cd backend
alembic upgrade head

# After changing a model in app/db/models.py, generate a new migration:
alembic revision --autogenerate -m "describe the change"
# review the generated file in alembic/versions/, then:
alembic upgrade head

# Roll back the most recent migration:
alembic downgrade -1
```

Alembic reads `DATABASE_URL` from the environment the same way the app does
(`alembic/env.py` imports `app.config`), so there's nothing to configure
separately. On Render, run `alembic upgrade head` as part of the deploy —
see `render.yaml`'s `startCommand`, which runs it before starting uvicorn.
Migrations only ever add/alter schema on `upgrade`; nothing in this project
drops or truncates data automatically.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/ask` | Orchestrator entry point — routes free text to a specialist |
| POST | `/api/product-explainer/ask` | Direct Product Explainer access (skips routing) |
| GET | `/api/risk/score` | Deterministic portfolio risk score + breakdown |
| GET | `/api/risk/scenarios` | List available stress-test scenarios |
| POST | `/api/risk/stress-test` | Run the Stress-Test Time Machine for one scenario |
| POST | `/api/scam/analyze` | Analyze a pasted message for fraud patterns |
| GET | `/api/portfolio` | Portfolio snapshot (value, risk, asset mix, goals) |
| POST | `/api/portfolio/summary` | Summary Agent's goal-linked narrative |
| GET / POST | `/api/documents` | List indexed documents / upload a new one (stored in Supabase Storage + Postgres) |
| DELETE | `/api/documents/{id}` | Delete a document from Supabase Storage + Postgres and re-index |
| GET | `/api/history` | Interaction history |
| GET | `/api/health` | Liveness + LLM/web-search/database/object-storage configuration status |

## Live web search

ClariFi can retrieve current web information through Tavily without exposing the
Tavily key to the browser. Add `TAVILY_API_KEY` to `backend/.env`. The
Orchestrator automatically searches the web for questions containing current
information signals such as "latest", "today", "current", market/news queries,
repo/interest rates, or recent SEBI/RBI regulations. The Ask page also has a
web-search toggle that forces live search for a question.

Web results are deduplicated and ranked with extra weight for primary financial
sources such as SEBI, RBI, AMFI, NSE and BSE. Current-data questions never
silently fall back to the static RAG corpus when live search returns no usable
sources.

The backend returns source URLs in `AskResponse.sources`, and the frontend
renders those sources as clickable links.

## Tests

```bash
pip install pytest
pytest tests/ -v
```

Covers the risk engine (score composition, determinism), the scam
pattern matcher (true/false positive sanity), and the compliance
guardrail (buy/sell language is actually stripped). These tests don't touch
the database or object storage.

## Operational notes

- The application starts with an empty document knowledge base. Only files uploaded through `/api/documents` are indexed.
- Uploaded PDF/TXT/MD files are stored in a private Supabase Storage bucket (`app/storage/supabase_storage.py`); only metadata and the object key live in PostgreSQL. Nothing persistent is written to local disk, so it's safe to run on Render's ephemeral filesystem.
- The current retriever is dependency-light TF-IDF + cosine similarity, rebuilt in memory from Postgres at startup and after each upload/delete. It is deterministic and citation-preserving; a hosted embedding/vector database (e.g. pgvector) can be swapped in later behind the same `retriever.py` interface.
- Historical stress scenarios use fixed educational shock assumptions rather than a brokerage-grade backtest.
- Portfolio and history data are stored in PostgreSQL and start empty on a fresh database.

## Environment variables

Create `backend/.env` (next to this README) — see `backend/.env.example` for the full annotated list. In production (Render), set these as real service environment variables instead of a committed file.

```env
# Supabase Connect → Session pooler URI (port 5432)
DATABASE_URL=postgresql://postgres.<PROJECT-REF>:password@<POOLER-HOST>:5432/postgres

SUPABASE_URL=https://<PROJECT-REF>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_secret_key
SUPABASE_STORAGE_BUCKET=clarifi-documents

GEMINI_API_KEY=your_gemini_key
TAVILY_API_KEY=your_tavily_key
CLARIFI_LLM_MODEL=gemini-2.5-flash-lite
CLARIFI_TAVILY_MAX_RESULTS=6
CLARIFI_FRONTEND_ORIGIN=http://localhost:5173
```

The Supabase service/secret key is server-only. Never put it in Vite/Vercel frontend variables or commit it to source control.

## Deploying to Render

1. **Create a Supabase project** and create a private Storage bucket named `clarifi-documents`.
2. **Copy the database connection** from Supabase Dashboard → Connect → **Session pooler**. For Render, use the Session pooler URI on port `5432`.
3. **Create a Render Web Service** with root directory `backend`.
   - Build command: `pip install -r requirements.txt`
   - Start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health check path: `/api/health`
4. **Set Render environment variables**: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or the supported Supabase secret-key value), `SUPABASE_STORAGE_BUCKET`, `GEMINI_API_KEY`, `TAVILY_API_KEY`, `CLARIFI_LLM_MODEL`, `CLARIFI_TAVILY_MAX_RESULTS`, and `CLARIFI_FRONTEND_ORIGIN`.
5. Deploy. The start command runs `alembic upgrade head` against Supabase before Uvicorn, so the `documents`, `document_chunks`, `portfolio`, and `history` tables are created automatically on the first deployment.

Render is IPv4-only in the relevant deployment setup, while Supabase's direct database endpoint is IPv6 by default; Supabase documents the shared Session pooler on port 5432 as the IPv4-compatible option for Render.

