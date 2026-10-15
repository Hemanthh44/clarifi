# ClariFi production deployment check

## Vercel (frontend)

Required environment variable:

- `VITE_API_URL=https://<your-render-service>.onrender.com`

The production Vite build intentionally fails if `VITE_API_URL` is missing. `vercel.json` configures the `dist` output and SPA routing fallback so direct routes such as `/portfolio` and `/documents` work.

## Render (backend)

`render.yaml` creates only the Python web service. PostgreSQL and Storage are hosted by Supabase. Set these service variables in Render:

Required for core production readiness:

- `CLARIFI_FRONTEND_ORIGIN=https://<your-vercel-domain>`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (or the newer Supabase secret key value in the supported server-only variable)
- `SUPABASE_STORAGE_BUCKET=clarifi-documents`

Provided automatically by the Blueprint:

- `SUPABASE_STORAGE_BUCKET=clarifi-documents`
- `CLARIFI_ENVIRONMENT=production`

You must supply `DATABASE_URL` from Supabase Connect → Session pooler. Render is IPv4-only, so use the Session pooler URI on port 5432.

Optional integrations:

- `GEMINI_API_KEY`
- `TAVILY_API_KEY`


The start command runs `alembic upgrade head` before Uvicorn. In production the backend refuses to silently fall back to SQLite if `DATABASE_URL` is absent.

## Health check

Render checks `GET /api/health`. It returns HTTP 200 only when PostgreSQL and Supabase Storage configuration are reachable; otherwise it returns HTTP 503 with a degraded status. Gemini and Tavily remain optional.

## Local verification commands

Frontend (requires npm registry access):

```bash
npm ci
VITE_API_URL=https://example.onrender.com npm run build
npm run lint
```

Backend:

```bash
python -m compileall -q backend/app backend/tests
PYTHONPATH=backend pytest -q backend/tests
```
