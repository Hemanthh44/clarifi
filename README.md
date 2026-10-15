# ClariFi

ClariFi is a multi-agent financial analysis workspace. This build is designed to run from **real user input**, not seeded portfolio, scam, history, or document demo data.

## Architecture

```
User
 │
 ▼
Vercel — React/Vite frontend
 │  HTTPS
 ▼
Render — FastAPI backend
 ├── Supabase PostgreSQL (portfolio, history, document metadata + chunks)
 ├── Supabase Storage (uploaded PDF/TXT/MD files)
 ├── Gemini        (LLM narration + intent classification)
 └── Tavily        (live web search)
```

The frontend never talks to Postgres, Supabase Storage, Gemini, or Tavily directly — every
request goes through the FastAPI backend, which is the only place API keys
and connection strings live.

## What is connected

- **Product Explainer:** upload PDF/TXT/MD documents; files are stored in Supabase Storage, their extracted text is chunked into PostgreSQL, and answers are grounded in that content.
- **Scam Screener:** sends the exact message to the FastAPI fraud-pattern engine and returns a deterministic risk level, score, highlighted signals, and explainability.
- **Risk Simulator / Risk Profile:** uses the portfolio allocation entered by the user and a deterministic Python risk engine. No sample portfolio is preloaded.
- **Portfolio Overview:** saves the user's portfolio and goals in PostgreSQL and derives risk metrics from the saved allocation. Shows an empty state until a portfolio is saved.
- **Portfolio Summary:** uses the saved portfolio with Gemini when configured, with a deterministic analytical fallback if Gemini is unavailable.
- **Documents:** reads the backend's actual indexed document store (Supabase PostgreSQL + Supabase Storage). No bundled financial documents are loaded.
- **History:** records completed portfolio, scam, and document-analysis actions in PostgreSQL; starts empty and survives restarts/redeploys.
- **Ask ClariFi:** uses the orchestrator, uploaded-document RAG, and optional Tavily live web search with source citations.

## Local development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` (see `backend/.env.example` for the full list):

```env
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/clarifi
SUPABASE_URL=https://<PROJECT-REF>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_secret_key
SUPABASE_STORAGE_BUCKET=clarifi-documents
GEMINI_API_KEY=your_new_key
TAVILY_API_KEY=your_new_key
CLARIFI_LLM_MODEL=gemini-2.5-flash-lite
CLARIFI_FRONTEND_ORIGIN=http://localhost:5173
CLARIFI_TAVILY_MAX_RESULTS=6
```

Create the schema, then run:

```bash
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

If you skip `DATABASE_URL`, the backend falls back to a local SQLite file so you can poke around without installing Postgres — this is a dev-only convenience, not how it runs in production. See `backend/README.md` for the full local/RAG/migration details.

### Frontend

```bash
npm install
npm run dev
```

If `vite is not recognized`, run `npm install` from the project root first.

## Deploying to production

**Frontend → Vercel:**
1. Import this repo into Vercel, keep the default build (`npm install && npm run build`, output `dist/`).
2. Set one environment variable: `VITE_API_URL=https://your-render-backend.onrender.com`.
3. Do **not** add Gemini, Tavily, `DATABASE_URL`, or `Supabase server secrets` values to Vercel — those are backend-only secrets.

**Backend → Render:**
1. Create a Supabase project and a private Storage bucket named `clarifi-documents`.
2. Copy the Supabase database URI from **Connect → Session pooler** (port 5432) for Render.
3. Create a Render Web Service pointing at `backend/`:
   - Build: `pip install -r requirements.txt`
   - Start: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health check: `/api/health`
4. Set the backend environment variables on Render: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `GEMINI_API_KEY`, `TAVILY_API_KEY`, `CLARIFI_LLM_MODEL`, `CLARIFI_TAVILY_MAX_RESULTS`, and `CLARIFI_FRONTEND_ORIGIN` (your Vercel domain).
5. Deploy, then confirm `GET /api/health` returns `"database": "connected"` and `"object_storage": "configured"`.

Full step-by-step detail (including Alembic commands and what's stored where) is in `backend/README.md`. `render.yaml` in this directory can also drive the Render side as a Blueprint if you prefer that over the dashboard.

## Important

- API keys and connection strings belong only in `backend/.env` locally, or Render's environment variables in production. Never commit them or put them in Vercel.
- Supabase PostgreSQL and Supabase Storage are the only persistent stores; there is no SQLite or local-disk dependency in production.
- There is no authentication yet — the app has exactly one shared portfolio/history/document library. See "User data isolation" in `backend/README.md` before treating this as multi-tenant.


### Production safeguards included

- `vercel.json` supplies SPA rewrites for React Router direct/deep links.
- Production Vite builds require `VITE_API_URL`, preventing a deployed frontend from accidentally targeting localhost.
- Render sets `CLARIFI_ENVIRONMENT=production`; production refuses to fall back to SQLite if `DATABASE_URL` is missing.
- `/api/health` returns HTTP 503 when PostgreSQL is unreachable or Supabase Storage is not configured, so Render can reject an unhealthy deployment.
- See `DEPLOYMENT_CHECK.md` for the final environment-variable checklist.
