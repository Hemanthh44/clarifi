# ClariFi — redesign + authentication

## 1. Visual redesign (Dark Navy · Emerald · Mint)

**Tokens** live in `tailwind.config.js`; **glass primitives** live in `src/index.css`.

| Role | Value |
|---|---|
| Canvas | `#060B16` navy, with layered emerald/mint radial gradients |
| Card surface | `#112036` at ~60% opacity, 18px backdrop blur |
| Emerald accent | `#2BD79B` (text/icons), `#10B981` (fills) |
| Mint accent | `#7FEEDB` |
| Text | `#F2F7FC` / `#BCCBDF` / `#8A9DBA` |

Reusable classes: `.cf-glass`, `.cf-glass-soft`, `.cf-glass-sheen` (emerald top-edge
highlight), `.cf-hover-lift`, `.cf-input`, `.cf-gradient-text`, `.cf-aurora`.

### Contrast

Every text/background pair measures AA or better; most are AAA. Lowest is
5.93:1 (muted text on a card).

The previous primary button was `bg-accent text-white` — **1.87:1**, a real
accessibility failure. Primary buttons now use dark navy text on the emerald
gradient: **10.79:1**.

### Files rewritten

`Basics` (Card/Panel/Badge/Avatar/PageHeader), `Button`, `Input`, `Logo`,
`States`, `Sidebar`, `MobileNav`, `AppLayout`, `AuthLayout`, `FinancialCards`,
`Dashboard`, `Settings`, `Login`, `Signup`. Remaining pages were swept onto the
shared tokens and given consistent responsive gutters
(`px-5 sm:px-6 py-8 sm:py-10`).

## 2. Authentication (new — none previously existed)

Login/Signup were UI stubs calling `navigate("/dashboard")`. There was no user
table, token, or auth router; `app/db/models.py` said so directly.

**Backend**
- `app/db/models.py` — `User` model
- `alembic/versions/0003_users.py` — `users` table
- `app/auth/security.py` — PBKDF2-HMAC-SHA256 (600k iterations, per-password
  salt) + HS256 JWT. Standard library only, matching how `app/rag/embeddings.py`
  and `app/ml/document_classifier.py` avoid heavy dependencies.
- `app/auth/deps.py` — `get_current_user` / `get_optional_user`
- `app/routers/auth.py` — `POST /api/auth/signup`, `POST /api/auth/login`,
  `GET /api/auth/me`. Login and signup return an identical error for unknown
  email and wrong password, so the endpoint can't enumerate accounts.

**Frontend**
- `src/lib/auth.jsx` — `AuthProvider`, `useAuth`, `RequireAuth`,
  `RedirectIfAuthed`. Restores a session on boot via `/api/auth/me` rather than
  trusting a cached name.
- `src/lib/api.js` — attaches `Authorization: Bearer`, clears the token and
  drops to anonymous on any 401.

**Config** — `CLARIFI_JWT_SECRET` documented in `backend/.env.example` and wired
into `render.yaml` with `generateValue: true`. Required in production; in
development a random per-process secret is generated (so restarting logs you
out, which is the intended nudge to set a real one).

### The name

`Sidebar`, `Settings`, and the Dashboard greeting ("Good morning, {firstName}")
all render the signed-in account from `/api/auth/me`. The hardcoded
`"ClariFi User"` is gone.

## 3. Known gaps

**Per-user data isolation is NOT done.** Portfolio, history and documents are
still a single shared workspace — two accounts see the same portfolio. The
`user_id` columns exist on every table and are ready to be scoped; doing it is a
deliberate follow-up, not an oversight.

**Password hashing** — PBKDF2 is solid and dependency-free, but argon2id or
bcrypt are stronger if you'll accept a dependency.

**The ML features are not built.** See below.

## 4. Why the ML features aren't built

Spending-pattern analysis, anomaly/fraud detection and behaviour prediction need
transaction data. The data model has none:

- `portfolio` — one row: total value, equity/debt/others percentages, goal counts
- `history` — app activity log (titles and previews)
- `documents` / `document_chunks` — uploaded PDFs and their text

No transactions, no account feed, no bank integration. The only way to ship a
working-looking spending analyser today is to generate the transactions, which is
the mock data the brief ruled out — and a fabricated fraud detector is worse than
none. The codebase already takes this position: *"ClariFi intentionally shows no
sample holdings or fabricated financial activity."*

**What's needed first — one of:**

1. **Statement upload** — parse bank/card PDFs into transactions. Best fit; PDF
   extraction and Supabase Storage already exist.
2. **CSV import** — fastest to build, most banks export it.
3. **Account aggregator** — real ongoing data, but a large integration with
   regulatory weight.

Once transactions exist, the models are real and dependency-light, reusing the
existing `TfidfVectorizer`: merchant categorisation, seasonal-decomposition
anomaly detection, per-category forecasting.

## 5. Verification

- 8/8 existing backend tests pass
- Auth smoke tests pass (signup, duplicate email, login, wrong password,
  `/me` with valid / missing / tampered token, short-password rejection)
- `oxlint`: 0 errors, 9 warnings (baseline was 8; the extra is the standard
  fast-refresh notice on the context file)
- `vite build` succeeds — 1902 modules
