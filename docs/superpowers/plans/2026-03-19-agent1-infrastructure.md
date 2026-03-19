# Infrastructure (PostgreSQL + Docker + CORS + JWT) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the backend from SQLite to PostgreSQL, add Alembic migrations, containerize all services with Docker, and harden env var validation (CORS, JWT).

**Architecture:** Replace hardcoded SQLite URL with env-driven PostgreSQL. Use Alembic for schema management — `init_db()` calls `alembic upgrade head` at startup. Three Docker services (`db`, `backend`, `frontend`) orchestrated with docker-compose.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic, psycopg2-binary, Docker, nginx

**Spec:** `docs/superpowers/specs/2026-03-19-production-readiness-design.md` — Agent 1 section

---

## File Structure

| Action | File | Purpose |
|--------|------|---------|
| Modify | `backend/requirements.txt` | Add psycopg2-binary, alembic |
| Modify | `backend/app/database.py` | PostgreSQL URL, startup validation, Alembic-based init |
| Modify | `backend/app/main.py` (top section only) | JWT startup validation, simplified CORS default |
| Create | `backend/alembic.ini` | Alembic config (URL set via env.py, not hardcoded) |
| Create | `backend/alembic/env.py` | Reads DATABASE_URL from env |
| Create | `backend/alembic/versions/<hash>_baseline.py` | Initial migration for all 5 existing tables |
| Create | `backend/Dockerfile` | Python 3.11-slim, uvicorn |
| Create | `frontend/Dockerfile` | Node 20 build → nginx:alpine serve |
| Create | `frontend/nginx.conf` | Serve static, proxy /api/ to backend |
| Create | `docker-compose.yml` | db + backend + frontend services |
| Create | `.env.example` | All required env vars with documentation |

---

## Chunk 1: Dependencies and Database Layer

### Task 1: Add PostgreSQL and Alembic dependencies

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add dependencies**

Edit `backend/requirements.txt` — append these two lines:
```
psycopg2-binary==2.9.9
alembic==1.13.1
```

- [ ] **Step 2: Verify install**

```bash
cd /Users/hamzasalama/MatchMyRoom/backend
source ../.venv/bin/activate
pip install psycopg2-binary==2.9.9 alembic==1.13.1
pip show psycopg2-binary alembic
```
Expected: Both packages show `Version:` lines with no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/requirements.txt
git commit -m "feat: add psycopg2-binary and alembic dependencies"
```

---

### Task 2: Update database.py for PostgreSQL + startup validation

**Files:**
- Modify: `backend/app/database.py`

- [ ] **Step 1: Write the test**

Create `tests/test_database_config.py`:
```python
import pytest
import sys
import importlib


def test_database_url_required_when_not_set(monkeypatch):
    """Importing database.py without DATABASE_URL set must raise RuntimeError."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    # Remove cached module so re-import triggers module-level check
    for key in list(sys.modules.keys()):
        if "backend.app.database" in key or "app.database" in key:
            del sys.modules[key]
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        import backend.app.database  # noqa: F401


def test_database_url_accepted_when_set(monkeypatch):
    """Importing database.py with DATABASE_URL set must not raise."""
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./test_config.db")
    for key in list(sys.modules.keys()):
        if "backend.app.database" in key or "app.database" in key:
            del sys.modules[key]
    # Should not raise
    import backend.app.database  # noqa: F401
    import os, pathlib
    pathlib.Path("test_config.db").unlink(missing_ok=True)
```

- [ ] **Step 2: Run test — it should FAIL before the fix (database.py still has SQLite default)**

```bash
cd /Users/hamzasalama/MatchMyRoom
source .venv/bin/activate
python -m pytest tests/test_database_config.py::test_database_url_required_when_not_set -v
```
Expected: FAIL — the current `database.py` defaults to SQLite, so no RuntimeError is raised.

- [ ] **Step 3: Rewrite database.py**

Replace the entire contents of `backend/app/database.py` with:
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from .models import Base

# ─── Startup Validation ───
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is required. "
        "Set it in your .env file. Example: "
        "postgresql://user:password@localhost:5432/matchmyroom"
    )

# Preserve SQLite thread safety for test suite (tests use sqlite:// URLs)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Run Alembic migrations to head on startup."""
    from alembic.config import Config
    from alembic import command
    import os

    # Resolve alembic.ini path relative to this file's package root
    alembic_cfg_path = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
    alembic_cfg = Config(os.path.abspath(alembic_cfg_path))
    command.upgrade(alembic_cfg, "head")


def get_db():
    """Dependency for FastAPI endpoints to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 3b: Verify `social_links` column is in the models**

The existing `database.py` had a SQLite hack: `ALTER TABLE users ADD COLUMN social_links TEXT`. Before removing it, confirm that `social_links` is declared as a proper SQLAlchemy column in `backend/app/models.py` (User class). Check line 21: it should show `social_links = Column(JSON, nullable=True)`. If it is present, the Alembic autogenerate migration will include it and the hack is fully replaced. If it's absent, add `social_links = Column(JSON, nullable=True)` to the User model before running the migration.

- [ ] **Step 4: Run existing tests to check no regressions**

```bash
cd /Users/hamzasalama/MatchMyRoom
source .venv/bin/activate
DATABASE_URL=sqlite:///./test_temp.db python -m pytest tests/ -v --ignore=tests/test_database_config.py -x 2>&1 | head -60
```
Expected: Tests that previously passed still pass. (Some may fail if they need DB setup — that's OK for now, just ensure no import errors.)

- [ ] **Step 5: Commit**

```bash
git add backend/app/database.py tests/test_database_config.py
git commit -m "feat: require DATABASE_URL env var, replace SQLite default with PostgreSQL"
```

---

### Task 3: Fix JWT startup validation in main.py

**Files:**
- Modify: `backend/app/main.py` (lines 37–38 only — the JWT_SECRET assignment)

- [ ] **Step 1: Write the test**

Create `tests/test_startup_validation.py`:
```python
import pytest
import sys


def reload_main(monkeypatch, env_overrides):
    """Helper: remove cached main module and re-import with given env vars."""
    for k, v in env_overrides.items():
        if v is None:
            monkeypatch.delenv(k, raising=False)
        else:
            monkeypatch.setenv(k, v)
    for key in list(sys.modules.keys()):
        if "backend.app" in key or "app.main" in key:
            del sys.modules[key]


def test_jwt_secret_required_at_startup(monkeypatch):
    """Importing main.py without JWT_SECRET must raise RuntimeError."""
    reload_main(monkeypatch, {
        "DATABASE_URL": "sqlite:///./test_jwt_check.db",
        "JWT_SECRET": None,  # unset
    })
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        import backend.app.main  # noqa: F401


def test_jwt_secret_accepted_when_set(monkeypatch):
    """Importing main.py with JWT_SECRET set must not raise."""
    reload_main(monkeypatch, {
        "DATABASE_URL": "sqlite:///./test_jwt_ok.db",
        "JWT_SECRET": "a" * 32,
    })
    import backend.app.main  # noqa: F401
    import pathlib
    pathlib.Path("test_jwt_check.db").unlink(missing_ok=True)
    pathlib.Path("test_jwt_ok.db").unlink(missing_ok=True)
```

- [ ] **Step 2: Run test**

```bash
python -m pytest tests/test_startup_validation.py -v
```
Expected: PASS

- [ ] **Step 3: Edit main.py — replace JWT_SECRET line**

Find lines 37–38 in `backend/app/main.py`:
```python
JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_hex(32))
```

Replace with:
```python
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is required. "
        "Set it in your .env file. Use: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
```

Also remove `import secrets` from the top imports (line 8) since it's no longer used for JWT_SECRET. (Check if `secrets` is used elsewhere first — if it's used in `generate_verification_code()` or similar, keep the import.)

- [ ] **Step 4: Fix CORS default while in main.py**

Find lines 42–45:
```python
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:3001"
).split(",")
```

Replace with:
```python
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173"
).split(",")
```

- [ ] **Step 5: Verify the app starts with env vars set**

```bash
cd /Users/hamzasalama/MatchMyRoom/backend
DATABASE_URL=sqlite:///./test_temp.db JWT_SECRET=testsecretthatis32charslong12345 python -c "from app.main import app; print('OK')"
```
Expected: Prints `OK` with no errors.

- [ ] **Step 6: Verify the app refuses to start without JWT_SECRET**

```bash
cd /Users/hamzasalama/MatchMyRoom/backend
DATABASE_URL=sqlite:///./test_temp.db python -c "from app.main import app" 2>&1
```
Expected: `RuntimeError: JWT_SECRET environment variable is required.`

- [ ] **Step 7: Commit**

```bash
git add backend/app/main.py tests/test_startup_validation.py
git commit -m "feat: require JWT_SECRET at startup, fail fast instead of silent random fallback"
```

---

## Chunk 2: Alembic Setup and Initial Migration

### Task 4: Initialize Alembic and configure it

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/` (directory)

- [ ] **Step 1: Initialize Alembic**

```bash
cd /Users/hamzasalama/MatchMyRoom/backend
source ../.venv/bin/activate
alembic init alembic
```
Expected: Creates `alembic.ini` and `alembic/` directory with `env.py`, `script.py.mako`, `versions/`.

- [ ] **Step 2: Configure alembic.ini to NOT hardcode database URL**

In `backend/alembic.ini`, find the line:
```
sqlalchemy.url = driver://user:pass@localhost/dbname
```
Replace with:
```
# URL is set dynamically in env.py from DATABASE_URL environment variable
sqlalchemy.url =
```

- [ ] **Step 3: Update alembic/env.py to read DATABASE_URL from environment**

Replace the entire contents of `backend/alembic/env.py` with:
```python
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add the backend directory to path so we can import app models
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.models import Base

# this is the Alembic Config object
config = context.config

# Set the database URL from environment variable
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL environment variable is required for Alembic")
config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use our models' metadata for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 4: Verify Alembic imports successfully and can see the models**

```bash
cd /Users/hamzasalama/MatchMyRoom/backend
DATABASE_URL=sqlite:///./test_alembic.db python -c "
from alembic.config import Config
from alembic import command
import os
cfg = Config('alembic.ini')
# Just test that env.py loads without errors
print('Alembic env loaded OK')
"
```
Expected: Prints `Alembic env loaded OK` with no import errors. (Do NOT use `alembic check` — it fails if there are unapplied migrations, which is expected at this stage.)

- [ ] **Step 5: Commit Alembic scaffold**

```bash
git add backend/alembic.ini backend/alembic/
git commit -m "feat: initialize Alembic with env-driven DATABASE_URL"
```

---

### Task 5: Write the initial baseline migration

**Files:**
- Create: `backend/alembic/versions/<hash>_baseline_schema.py`

- [ ] **Step 1: Generate the baseline migration via autogenerate**

```bash
cd /Users/hamzasalama/MatchMyRoom/backend
DATABASE_URL=sqlite:///./test_alembic_fresh.db alembic revision --autogenerate -m "baseline_schema"
```
Expected: Creates a file at `backend/alembic/versions/<hash>_baseline_schema.py`.

- [ ] **Step 2: Inspect the generated migration**

Open the generated file and verify it contains `op.create_table(...)` calls for all 5 tables:
- `users`
- `questionnaire_responses`
- `matches`
- `likes`
- `messages`

If any table is missing, it likely means the model isn't imported into `env.py`'s `Base.metadata`. All models are in `app/models.py` which is imported via `from app.models import Base` — verify this import is present in `env.py`.

- [ ] **Step 3: Test the migration runs on a fresh SQLite DB**

```bash
cd /Users/hamzasalama/MatchMyRoom/backend
rm -f test_migration.db
DATABASE_URL=sqlite:///./test_migration.db alembic upgrade head
```
Expected: Exits with code 0. No errors.

- [ ] **Step 4: Verify tables were created**

```bash
sqlite3 test_migration.db ".tables"
```
Expected: `email_verifications  likes  matches  messages  questionnaire_responses  users`

Wait — `email_verifications` is in `main.py` but check if it's an SQLAlchemy model. If not (it might be in-code logic), that's fine — only create tables for SQLAlchemy models.

- [ ] **Step 5: Clean up temp test files**

```bash
rm -f test_alembic.db test_alembic_fresh.db test_migration.db test_temp.db
```

- [ ] **Step 6: Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat: add baseline Alembic migration for all existing tables"
```

---

## Chunk 3: Docker Configuration

### Task 6: Create backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Create backend/Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Verify the Dockerfile syntax is valid**

```bash
cd /Users/hamzasalama/MatchMyRoom
docker build -f backend/Dockerfile backend/ --no-cache -t matchmyroom-backend-test 2>&1 | tail -20
```
Expected: `Successfully built <hash>` or `=> exporting to image` with no errors. (Requires Docker to be running.)

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile
git commit -m "feat: add backend Dockerfile (Python 3.11-slim + uvicorn)"
```

---

### Task 7: Create frontend Dockerfile and nginx.conf

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`

- [ ] **Step 1: Create frontend/nginx.conf**

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Proxy API requests to the backend service
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # SPA fallback — serve index.html for all non-file routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Create frontend/Dockerfile**

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Copy build output
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: Verify nginx.conf syntax (if nginx is available)**

```bash
nginx -t -c /Users/hamzasalama/MatchMyRoom/frontend/nginx.conf 2>&1 || echo "nginx not available locally - will validate in container"
```

- [ ] **Step 4: Commit**

```bash
git add frontend/Dockerfile frontend/nginx.conf
git commit -m "feat: add frontend Dockerfile (Node 20 build + nginx serve) and nginx config"
```

---

### Task 8: Create docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create docker-compose.yml at repo root**

```yaml
version: "3.9"

services:
  db:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8000:8000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  pgdata:
```

- [ ] **Step 2: Create .env.example at repo root**

```
# ─── Database ───
DATABASE_URL=postgresql://user:password@localhost:5432/matchmyroom

# ─── Auth ───
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=your-secret-here-min-32-chars

# ─── CORS ───
# Comma-separated list of allowed frontend origins
ALLOWED_ORIGINS=https://yourdomain.com

# ─── Frontend URL ───
# Used in password reset emails
FRONTEND_URL=https://yourdomain.com

# ─── Cloudinary (profile photos) ───
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ─── Email / Resend ───
RESEND_API_KEY=

# ─── Email / SMTP fallback ───
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# ─── Docker Postgres (used by docker-compose only) ───
POSTGRES_USER=matchmyroom
POSTGRES_PASSWORD=changeme
POSTGRES_DB=matchmyroom
```

- [ ] **Step 3: Validate docker-compose config**

```bash
cd /Users/hamzasalama/MatchMyRoom
# Create a minimal .env for validation
echo "POSTGRES_USER=test\nPOSTGRES_PASSWORD=test\nPOSTGRES_DB=test\nJWT_SECRET=testsecret32charslong12345678\nDATABASE_URL=postgresql://test:test@db:5432/test" > .env.test
docker-compose --env-file .env.test config 2>&1 | head -30
rm .env.test
```
Expected: Prints the resolved docker-compose config with no errors.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: add docker-compose with postgres healthcheck, backend, frontend services"
```

---

## Chunk 4: Final Verification

### Task 9: End-to-end verification

- [ ] **Step 1: Ensure .env is set up for local testing**

Copy `.env.example` to `.env` if it doesn't exist, and fill in at minimum:
```
DATABASE_URL=postgresql://matchmyroom:changeme@localhost:5432/matchmyroom
JWT_SECRET=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
POSTGRES_USER=matchmyroom
POSTGRES_PASSWORD=changeme
POSTGRES_DB=matchmyroom
```

- [ ] **Step 2: Run docker-compose up**

```bash
cd /Users/hamzasalama/MatchMyRoom
docker-compose up --build -d
```
Expected: All 3 services start. No exit codes.

- [ ] **Step 3: Wait for services and check health**

```bash
sleep 10
docker-compose ps
curl -s http://localhost:8000/api/health || curl -s http://localhost/api/health
```
Expected: JSON response `{"status": "healthy"}` or similar.

- [ ] **Step 4: Check frontend loads**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost/
```
Expected: `200`

- [ ] **Step 5: Verify migrations ran**

```bash
docker-compose exec backend alembic history
```
Expected: Shows the baseline migration.

- [ ] **Step 6: Tear down**

```bash
docker-compose down
```

- [ ] **Step 7: Run existing test suite**

```bash
cd /Users/hamzasalama/MatchMyRoom
DATABASE_URL=sqlite:///./test_run.db JWT_SECRET=testsecret32charslong1234567890 python -m pytest tests/ -v -x 2>&1 | tail -30
rm -f test_run.db
```
Expected: All previously passing tests still pass.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: complete infrastructure setup — PostgreSQL, Alembic, Docker, CORS, JWT hardening"
```
