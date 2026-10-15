# ClariFi — local run guide

## Backend

PowerShell:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

If `DATABASE_URL` is not set, development uses a local SQLite database automatically.
Document uploads use the configured Supabase Storage bucket
automatically. This makes Product Explainer and Scam Screener usable without cloud
credentials.

API docs: http://localhost:8000/docs

## Frontend

Open a second terminal at the repository root:

```powershell
npm ci
npm run dev
```

Open http://localhost:5173.

The frontend defaults to `http://localhost:8000` when `VITE_API_URL` is not set.

## Production deployment

### Render

Use the included `render.yaml`, or create:

- PostgreSQL database
- Python web service with root directory `backend`
- Build: `pip install -r requirements.txt`
- Start: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Set `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, and `CLARIFI_FRONTEND_ORIGIN`.
Gemini and Tavily are optional.

### Vercel

Set:

```text
VITE_API_URL=https://<your-render-service>.onrender.com
```

Then deploy the repository as a Vite project. The included `vercel.json` handles
the SPA fallback so direct routes work.

## Verification

Backend:

```powershell
python -m compileall -q backend/app backend/tests
$env:PYTHONPATH="backend"
pytest -q backend/tests
```

Frontend:

```powershell
npm run build
```
