# MatchMyRoom

Roommate matching for McGill/Concordia students. FastAPI + SQLAlchemy + Postgres backend,
React + Vite frontend, Supabase Auth, Cloudinary photos.

- `backend/app/` — API (`main.py` holds every route), models, `matching.py` (weighted scoring)
- `backend/alembic/` — migrations
- `frontend/src/` — React app (`App.jsx` is most of the UI)
- `tests/` — backend pytest suite

## Commands
Backend (Python 3.11, venv at `backend/.venv`):
- Install: `python3.11 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt -r backend/requirements-test.txt`
- Run: `cd backend && .venv/bin/python -m uvicorn app.main:app --reload` (port 8000, docs at /docs)
- Test: `ENV=development backend/.venv/bin/python -m pytest tests/ -q` (run from repo root)

Frontend (`cd frontend`, npm):
- Install: `npm ci` · Dev: `npm run dev` (port 3000, proxies `/api` to :8000)
- Build: `npm run build` · Lint: `npm run lint`

## Verification
- Backend change: pytest from repo root.
- Frontend change: `npm run build` must pass. UI changes: run the dev server and check in the browser.
- Bugfixes are test-first: add a failing test in `tests/` before fixing.

## Gotchas
- `tests/conftest.py` forces `DATABASE_URL=sqlite:///:memory:`, so the suite never touches a
  real DB. Migration tests skip unless `TEST_POSTGRES_URL` is set. Never run anything with a
  prod `DATABASE_URL` exported; app startup runs `alembic upgrade head` on Postgres.
- DB ids are `uuid.UUID`. Comparing one to a `str` is always unequal, and this has caused
  repeated bugs (self-matches, false 403s). Keep ids as UUID end to end.
- Supabase JWTs are verified against the JWKS at `SUPABASE_URL` (`backend/app/main.py`).
- CI (`.github/workflows/ci.yml`) runs pytest plus frontend lint and build.
- Deploys: backend to Fly (`backend/fly.toml`) and Railway (`Procfile`). Never deploy from here.
- Env vars: backend reads DATABASE_URL, SUPABASE_URL, ENV, ALLOWED_ORIGINS, FRONTEND_URL,
  APP_URL, CLOUDINARY_*, RESEND_API_KEY, SMTP_*, FROM_EMAIL, ANTHROPIC_API_KEY. Frontend reads
  VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
