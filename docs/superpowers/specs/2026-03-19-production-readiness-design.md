# MatchMyRoom Production Readiness — Design Spec
**Date:** 2026-03-19
**Scope:** Critical + High priority fixes for launch to hundreds of users
**Approach:** Option A — Layer-based split across 3 parallel subagents

---

## Overview

The app's core features (auth, matching, swipes, messaging) are working. This spec covers the infrastructure, backend features, and frontend work needed to make it production-safe for hundreds of real users. Work is divided into 3 agents: Agent 1 (Infrastructure) is fully independent. Agents 2 (Backend Features) and 3 (Frontend) share the API contracts defined below and can work in parallel, communicating via SendMessage if API shape needs clarification.

**File overlap note:** `backend/app/main.py` is modified by both Agent 1 (CORS + JWT) and Agent 2 (new endpoints, rate limits). Agent 1's edits are confined to the top of the file (env var loading, startup validation, CORS config). Agent 2's edits add new route handlers at the bottom. The orchestrator merges after both complete.

**Migration ownership:** Agent 1 writes the initial baseline Alembic migration for existing tables. Agent 2 defines the three new models (`PasswordResetToken`, `Block`, `Report`) but does **not** run `alembic revision` independently — Alembic migration files form a linked chain (each has a `down_revision` pointing to its parent), and Agent 2 cannot know Agent 1's migration revision ID at runtime. Instead, the orchestrator generates the second migration after merging both agents' model changes: run `alembic revision --autogenerate -m "add_password_reset_tokens_blocks_reports"` once, verify the generated file has the correct `down_revision` pointing to Agent 1's baseline, and commit it.

**`FRONTEND_URL` ownership:** This env var is used only by Agent 2's password reset email logic. Agent 2 adds `FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")` to the env var loading section in `main.py` (bottom section, alongside its other new code). Agent 1 only lists it in `.env.example`. The orchestrator ensures there is exactly one `FRONTEND_URL` assignment in the merged `main.py`.

---

## Agent 1 — Infrastructure

### Responsibility
Everything needed for the app to run reliably in a hosted production environment. Touches: `database.py`, `main.py` (top section only), `requirements.txt`, new Docker/Alembic files.

### Pre-work: Audit for SQLite-specific constructs
Before writing any migration, Agent 1 must grep the codebase for:
- `PRAGMA` statements
- `ALTER TABLE` hacks in `init_db()`
- Any raw SQL strings with SQLite-specific syntax

Remove or replace anything that is not PostgreSQL-compatible.

### Tasks

#### 1. PostgreSQL Migration
- Change `DATABASE_URL` in `backend/app/database.py` from the hardcoded SQLite path to `os.getenv("DATABASE_URL")`. Add a startup check: if `DATABASE_URL` is not set, raise `RuntimeError("DATABASE_URL environment variable is required")`.
- Add `psycopg2-binary` and `alembic` to `backend/requirements.txt`.
- Run `alembic init backend/alembic` to initialize the migrations folder.
- In `backend/alembic/env.py`, replace the hardcoded `sqlalchemy.url` with a read from the `DATABASE_URL` environment variable:
  ```python
  import os
  config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])
  ```
  so the URL is never hardcoded in `alembic.ini`.
- Write the **initial baseline migration** (for fresh database installs — this project has no production data to migrate). The migration must create all current tables: `users`, `matches`, `likes`, `messages`, `email_verifications`.
- Remove all `ALTER TABLE` hacks and `try/except` blocks from `init_db()` in `database.py`. The sole purpose of `init_db()` becomes calling `alembic upgrade head` via a subprocess or `alembic.command.upgrade`. **Decide: call `alembic upgrade head` in `init_db()` at startup via `alembic.command.upgrade(alembic_cfg, "head")`.** This is the correct approach for this project (not a manual deployment step). Document in `README` that migrations run automatically on startup.
- **Acceptance criteria:** Starting the backend against a fresh PostgreSQL database automatically creates all expected tables. `alembic history` shows one baseline migration. No `ALTER TABLE` or `PRAGMA` remains in `database.py`.

#### 2. Dockerfile + docker-compose
- `backend/Dockerfile`: Python 3.11-slim base, `pip install -r requirements.txt`, copy app, expose 8000, `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`.
- `frontend/Dockerfile`: Node 20 build stage (`npm ci && npm run build`), then nginx:alpine serve stage copying build output to `/usr/share/nginx/html`.
- `frontend/nginx.conf` (create this file, it is COPYed into the frontend image):
  ```nginx
  server {
      listen 80;
      root /usr/share/nginx/html;
      index index.html;
      location /api/ {
          proxy_pass http://backend:8000;
          proxy_set_header Host $host;
      }
      location / {
          try_files $uri $uri/ /index.html;
      }
  }
  ```
- `docker-compose.yml` at repo root:
  - `db`: postgres:15, named volume `pgdata` for persistence, reads `POSTGRES_USER/PASSWORD/DB` from `.env`. Healthcheck: `test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]`, `interval: 5s`, `retries: 5`.
  - `backend`: builds from `backend/Dockerfile`, `depends_on: {db: {condition: service_healthy}}`, passes all env vars from `.env`.
  - `frontend`: builds from `frontend/Dockerfile`, `depends_on: [backend]`, exposes port 80.
- **Acceptance criteria:** `docker-compose up --build` starts all three services without errors. `curl http://localhost/api/health` returns 200. The React app loads at `http://localhost`.

#### 3. CORS Fix
- In `backend/app/main.py` (top section, env var loading block), replace the hardcoded origins list with:
  ```python
  ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
  ```
- **Acceptance criteria:**
  - Default (no `ALLOWED_ORIGINS` env var): `http://localhost:5173` is the only allowed origin.
  - Single value: `ALLOWED_ORIGINS=https://example.com` → only `https://example.com` is allowed.
  - Multiple values: `ALLOWED_ORIGINS=https://a.com,https://b.com` → both are allowed.

#### 4. JWT Startup Validation
- In `backend/app/main.py` at module level (not inside a route handler), add:
  ```python
  JWT_SECRET = os.getenv("JWT_SECRET")
  if not JWT_SECRET:
      raise RuntimeError("JWT_SECRET environment variable is required. Set it in your .env file.")
  ```
  This replaces the existing `secrets.token_hex(32)` fallback.
- **Acceptance criteria:** Starting the backend without `JWT_SECRET` set causes an immediate `RuntimeError` with the above message. Setting it allows normal startup.

#### 5. `.env.example`
Create `.env.example` at repo root:
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/matchmyroom

# Auth
JWT_SECRET=your-secret-here-min-32-chars

# CORS (comma-separated list of allowed frontend origins)
ALLOWED_ORIGINS=https://yourdomain.com

# Frontend base URL (used in password reset emails)
FRONTEND_URL=https://yourdomain.com

# Cloudinary (profile photos)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (Resend)
RESEND_API_KEY=

# Email (SMTP fallback)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# Docker Postgres (used by docker-compose only)
POSTGRES_USER=matchmyroom
POSTGRES_PASSWORD=matchmyroom
POSTGRES_DB=matchmyroom
```

### Outputs
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `docker-compose.yml`
- `.env.example`
- Updated `backend/app/database.py`
- Updated `backend/app/main.py` (top section: CORS + JWT validation only)
- `backend/alembic/` folder with initial migration for existing tables
- Updated `backend/requirements.txt`

---

## Agent 2 — Backend Features

### Responsibility
New API endpoints and algorithm bug fixes. Writes to `main.py` (new route handlers section at bottom only), `models.py`, `schemas.py`, `matching.py`. Also generates and commits Alembic migration files for the 3 new models.

**Prerequisite check:** Verify `slowapi` is already installed and `limiter` is configured in `main.py` before adding `@limiter.limit()` decorators. If not present, add `slowapi` to `requirements.txt` and add the middleware setup to `main.py`.

**Block filtering — shared utility:** To avoid 4 independent implementations of the same query, create a helper function `get_blocked_user_ids(user_id: int, db: Session) -> set[int]` in a new file `backend/app/utils.py`. It returns the set of all user IDs that `user_id` has blocked OR that have blocked `user_id`. All four filtering call sites use this helper.

### API Contracts (shared with Agent 3)

| Endpoint | Method | Auth | Path Params | Request Body | Success Response | Key Error Responses |
|---|---|---|---|---|---|---|
| `/api/auth/forgot-password` | POST | None | — | `{email: str}` | `200 {message: "If that email is registered, you'll receive a reset link"}` | Always 200 (no 404) |
| `/api/auth/reset-password` | POST | None | — | `{token: str, new_password: str}` | `200 {message: "Password reset successfully"}` | `400` invalid/expired token; `422` missing fields |
| `DELETE /api/users/{user_id}` | DELETE | JWT (must match user_id) | `user_id: int` | — | `200 {message: "Account deleted"}` | `403` JWT mismatch |
| `POST /api/users/{user_id}/block` | POST | JWT (must match user_id) | `user_id: int` | `{blocked_user_id: int}` | `200 {message: "User blocked"}` | `400` already blocked or blocking self |
| `DELETE /api/users/{user_id}/block/{blocked_user_id}` | DELETE | JWT (must match user_id) | `user_id: int`, `blocked_user_id: int` | — | `200 {message: "User unblocked"}` | `404` block not found |
| `POST /api/users/{user_id}/report` | POST | JWT (must match user_id) | `user_id: int` | `{reported_user_id: int, reason: str}` | `200 {message: "Report submitted"}` | `400` reporting self |

**Important:** In all block/report endpoints, `user_id` in the path is the **logged-in user (the actor)**. `blocked_user_id` / `reported_user_id` in the body/path is the **target user**.

### Tasks

#### 1. Password Reset
- Add `PasswordResetToken` SQLAlchemy model to `models.py`:
  - `id` (PK), `user_id` (FK → users.id, ondelete="CASCADE"), `token` (String, unique, indexed), `expires_at` (DateTime), `used` (Boolean, default False).
- Add Pydantic schemas to `schemas.py`: `ForgotPasswordRequest(email: str)`, `ResetPasswordRequest(token: str, new_password: str)`.
- Add `FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")` to the env var loading section in `main.py`.
- `POST /api/auth/forgot-password`:
  - **Always return** `200 {message: "If that email is registered, you'll receive a reset link"}` regardless of whether the email exists (prevents account enumeration).
  - If email exists: generate `secrets.token_urlsafe(32)`. Delete all existing tokens (used or unused) for this user. Store new token with `expires_at = datetime.utcnow() + timedelta(hours=1)`, `used=False`. Send reset email using the existing email service with link: `f"{FRONTEND_URL}/reset-password?token={token}"`.
- `POST /api/auth/reset-password`:
  - If `token` is missing or empty string: FastAPI returns `422` automatically — this is acceptable. No special handling needed.
  - Look up token in DB. If not found, expired (`expires_at < datetime.utcnow()`), or `used=True`: return `400 {detail: "Invalid or expired reset token"}`.
  - Hash `new_password` with bcrypt, update user's `hashed_password`.
  - Mark token `used=True`.
  - Delete all other expired tokens for this user (cleanup on successful reset).
  - Return `200 {message: "Password reset successfully"}`.
- **Note on migrations:** Do NOT run `alembic revision` — the orchestrator generates all Agent 2 model migrations after merge (see Migration ownership in Overview).
- **Acceptance criteria:** Calling `forgot-password` with a real email sends an email. Calling `reset-password` with a valid token updates the password. Calling `reset-password` a second time with the same token returns 400. Calling `forgot-password` with a non-existent email returns 200 with the standard message.

#### 2. Account Deletion
- `DELETE /api/users/{user_id}`: verify JWT token matches `user_id`, return 403 if mismatch.
- **First, implement Tasks 3's models** (Block, Report) before implementing this cascade, because `blocks` and `reports` FK references must exist in the DB. If implementing in isolation, add a TODO comment noting that blocks/reports cascade deletes need to be added once those models exist.
- Cascade delete in this exact order:
  1. `reports` where `reporter_id = user_id` OR `reported_id = user_id`
  2. `blocks` where `blocker_id = user_id` OR `blocked_id = user_id`
  3. `messages` where `sender_id = user_id` OR `receiver_id = user_id`
  4. `likes` where `liker_id = user_id` OR `liked_id = user_id`
  5. `matches` where `user1_id = user_id` OR `user2_id = user_id`
  6. `password_reset_tokens` where `user_id = user_id`
  7. `email_verifications` where `user_id = user_id`
  8. Delete Cloudinary profile photo: First check the existing upload code in `main.py` (the profile picture upload endpoint) to see if it stores `public_id` separately in the users table. If it does, use that value directly. If only `profile_picture_url` is stored, extract `public_id` from the URL using this pattern — Cloudinary URLs have the format `https://res.cloudinary.com/<cloud>/image/upload/v<version>/<public_id>.<ext>` (optionally with transformation segments before `v<version>`). Extract the `public_id` as the path component after the last `/v{digits}/`, stripping the file extension. Example: `https://res.cloudinary.com/demo/image/upload/v1234/matchmyroom/user_42.jpg` → `public_id = "matchmyroom/user_42"`. After extracting, call `cloudinary.uploader.destroy(public_id)` and log the result (do not raise an error if Cloudinary returns `"not found"` — the photo may already be gone).
  9. Delete user row.
- Return `200 {message: "Account deleted"}`.
- **Acceptance criteria:** After calling this endpoint, the user row is gone, all related rows are gone, Cloudinary photo is deleted, and attempting to log in with that email returns a 404/401.

#### 3. Block / Report
- Add `Block` model to `models.py`: `blocker_id` (FK → users.id, ondelete="CASCADE"), `blocked_id` (FK → users.id, ondelete="CASCADE"), `created_at`. Composite PK `(blocker_id, blocked_id)`.
- Add `Report` model to `models.py`: `id` (PK), `reporter_id` (FK → users.id, ondelete="CASCADE"), `reported_id` (FK → users.id, ondelete="CASCADE"), `reason` (String), `created_at`.
- **Note on migrations:** Do NOT run `alembic revision` — the orchestrator generates the migration for these models after merge.
- Create `backend/app/utils.py` with:
  ```python
  def get_blocked_user_ids(user_id: int, db: Session) -> set[int]:
      """Returns all user IDs that user_id has blocked OR that have blocked user_id."""
      blocks = db.query(Block).filter(
          (Block.blocker_id == user_id) | (Block.blocked_id == user_id)
      ).all()
      return {b.blocked_id if b.blocker_id == user_id else b.blocker_id for b in blocks}
  ```
- Implement all 3 block/report API endpoints per the contracts table. Edge cases:
  - `POST /block`: if `blocked_user_id == user_id`, return `400 {detail: "Cannot block yourself"}`. If block already exists, return `400 {detail: "User already blocked"}`.
  - `DELETE /block/{blocked_user_id}`: if block row not found, return `404 {detail: "Block not found"}`.
  - `POST /report`: if `reported_user_id == user_id`, return `400 {detail: "Cannot report yourself"}`. Duplicate reports are allowed (append-only for moderation review).
- **Block filtering is bidirectional** — use `get_blocked_user_ids()` at all four sites:
  - `GET /api/matches/{user_id}`: filter out matches where the other user is in the blocked set.
  - `GET /api/messages/threads/{user_id}`: filter out threads where the other party is in the blocked set.
  - `POST /api/messages/send`: if either user is in the other's blocked set, return `403 {detail: "Cannot send message to this user"}`.
  - `matching.py` (new match generation): locate the function that writes a new match row to the database (the DB write step, not the score calculation). Before the `db.add(match)` / `db.commit()` call, call `get_blocked_user_ids()` for user1 and check if user2 is in the result. If blocked, skip the DB write and continue to the next pair. This applies to both incremental (single-user) and bulk recalculation code paths — ensure the check is at the DB write step in all paths, not just one.
- **Existing matches when a block is created:** When a user blocks another, existing stored matches between them are **not deleted** — they are hidden at the API layer by the filter. State this explicitly in code comments. This is intentional: if the block is later removed, matches reappear.
- **Acceptance criteria:** After A blocks B: A's match list and thread list exclude B, B's match list and thread list exclude A, A cannot send messages to B (403), B cannot send messages to A (403). Blocking yourself returns 400. Reporting yourself returns 400.

#### 4. Rate Limiting Gaps
Add `@limiter.limit()` decorators to currently unprotected endpoints:
- Profile picture upload: `3/minute`
- Message send: `30/minute`
- Match calculation: `5/minute`
- Swipe record: `60/minute`
- **Prerequisite:** Before adding decorators, verify that `slowapi` is installed (`pip show slowapi`) and that `limiter` middleware is registered in `main.py` (look for `app.add_middleware(SlowAPIMiddleware)` or `app.state.limiter = limiter`). If not present, install `slowapi` and add the middleware setup — this goes in Agent 2's bottom section of `main.py`. Also ensure a `@app.exception_handler(RateLimitExceeded)` handler is registered, otherwise rate limit violations will return 500 instead of 429.
- **Acceptance criteria:** `curl -X POST http://localhost:8000/api/messages/send -H "Authorization: Bearer <token>" ...` repeated 31 times in under 60 seconds returns HTTP 429 on the 31st call.

#### 5. Matching Algorithm Bug Fixes
- **Bug 1 (lifestyle scoring):** In `matching.py`, locate Case 3 (both users looking for housing) and find the inline lifestyle scoring logic. Replace the inline implementation with a call to the `_lifestyle_score()` helper to ensure consistent `None`-handling across all cases.
- **Bug 2 (gender preference index):** The default value for `genderPreference` is index `3`, but the UI's "No preference" option is index `2`. First verify this by checking the questionnaire options in the frontend. Then change the backend default to `2`.
- **Acceptance criteria:** Two users both with "No preference" gender preference receive the full gender compatibility score. Lifestyle scoring produces identical results for Case 2 and Case 3 with identical inputs.

#### 6. File Upload MIME Validation
- In the profile picture upload endpoint, before passing `file` to Cloudinary:
  ```python
  ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
  if file.content_type not in ALLOWED_MIME_TYPES:
      raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")
  ```
- **Acceptance criteria:** Uploading a `.txt` or `.svg` file returns HTTP 400. Uploading a valid `.jpg` succeeds.

### Outputs
- Updated `backend/app/main.py` (new route handlers at bottom: password reset, account deletion, block/report, rate limit decorators, file validation, `FRONTEND_URL` env var)
- Updated `backend/app/models.py` (PasswordResetToken, Block, Report models)
- Updated `backend/app/schemas.py` (new Pydantic schemas)
- Updated `backend/app/matching.py` (bug fixes + block check)
- New `backend/app/utils.py` (get_blocked_user_ids helper)
- New Alembic migration files for new models

---

## Agent 3 — Frontend

### Responsibility
UI for the 3 new user-facing features. Follows API contracts from Agent 2. All edits are within the existing `frontend/src/` structure.

**Note:** The frontend is primarily a single large `App.jsx` file with inline styles. Before writing any code, read `frontend/src/App.jsx` and `frontend/src/` to understand exactly where pages, routes, modals, and state are defined. All new pages and components must follow the existing inline-style pattern — no new CSS files, no new style libraries, no new npm dependencies.

**Development note:** Agent 2's endpoints will not exist until both agents finish. Agent 3 should build the UI components fully and wire up the API calls correctly per the contracts. The orchestrator performs integration testing after both agents complete.

### Tasks

#### 1. Password Reset Flow
- In the login form, add a "Forgot password?" text link below the submit button.
- Add route `/forgot-password` → `ForgotPasswordPage` component.
- Add route `/reset-password` → `ResetPasswordPage` component.

**ForgotPasswordPage:**
- Single email input, "Send Reset Link" button.
- On submit: call `POST /api/auth/forgot-password` (no auth token needed — use plain `fetch`, not `authFetch`).
- On success (200): show "If that email is registered, you'll receive a reset link." Hide the form.
- On network/server error (non-200): show "Something went wrong. Please try again."
- No 404 case — backend always returns 200.

**ResetPasswordPage:**
- On mount: read `?token=` from `new URLSearchParams(window.location.search).get('token')`. If token is null or empty, show: "Invalid reset link. Please request a new one." with a link back to `/forgot-password`.
- Show: new password input + confirm password input + "Reset Password" button.
- Client-side validation before submit: passwords must match and be at least 8 characters. Show inline error if not.
- On submit: call `POST /api/auth/reset-password` with `{token, new_password}` (no auth token).
- On 200 success: show "Password reset successfully! Redirecting to login..." and redirect to `/login` (or wherever the login view is) after 3 seconds using `setTimeout`.
- On 400 from API: show "This reset link is invalid or has expired. Please request a new one." with a link to `/forgot-password`.
- On other errors: show "Something went wrong. Please try again."

- **Acceptance criteria:** Full flow navigable in browser. Invalid/expired token shows error message with working link back to forgot-password form.

#### 2. Account Deletion
- Locate the profile edit section in `App.jsx` (the component/section where users update their name, bio, etc.). Add a visually separated "Danger Zone" section at the bottom, with a light red background or red-tinted border to signal risk.
- Add a "Delete My Account" button (red background `#c00`, white text).
- On click: open a confirmation modal with:
  - Title: "Delete Your Account"
  - Body: "This will permanently delete your account, profile, matches, and messages. This cannot be undone."
  - Two buttons: "Cancel" (secondary style, dismisses modal) and "Delete Forever" (red background).
- On "Delete Forever": call `DELETE /api/users/{user_id}` using `authFetch()`. Show a loading state on the button while in-flight.
  - On 200 success: clear `mmr_token` and `mmr_user` from `localStorage`, redirect to `/` (landing page).
  - On error: dismiss modal, show inline error "Something went wrong. Please try again."
- **Acceptance criteria:** "Delete Forever" deletes the account and navigates to landing. "Cancel" dismisses with no side effects. Loading state prevents double-submit.

#### 3. Block / Report
- Locate `ProfileModal` in `frontend/src/components/` or inline in `App.jsx`. Add two action buttons below existing actions.

**Block button:**
- Label: "Block User"
- Secondary/muted styling (not the primary theme color — use gray or light red to avoid confusion with match actions).
- On click: call `POST /api/users/{loggedInUserId}/block` with body `{blocked_user_id: viewedUser.id}`.
  - `loggedInUserId` = the current user's ID from localStorage (`mmr_user`).
  - `viewedUser.id` = the ID of the profile being viewed in the modal.
- On 200 success: close modal, remove the blocked user from the match list in local React state (filter them out — no page reload needed). Show a brief toast/notification: "User blocked."
- On 400 ("already blocked"): show "You have already blocked this user."
- On other errors: show "Something went wrong."

**Report button:**
- Label: "Report User"
- Muted styling.
- On click: open a report sub-modal (or replace modal content) with:
  - Heading: "Report User"
  - Reason `<select>` dropdown with options: `"Harassment"`, `"Fake Profile"`, `"Inappropriate Content"`, `"Other"`.
  - "Submit Report" button and "Cancel" button.
- On submit: call `POST /api/users/{loggedInUserId}/report` with body `{reported_user_id: viewedUser.id, reason: selectedReason}`.
- On 200 success: close modal, show toast "Report submitted. Thank you."
- On error: show "Something went wrong."

- **Acceptance criteria:** Block removes the user from the visible match list. Report modal shows with dropdown. Both error states handled. Both use correct user IDs per the API contract (logged-in user in path, target user in body).

#### 4. Style Consistency Rules
- All new pages and modals use `theme.primary` for accent elements, where theme follows the existing pattern: `#c8102e` for `@mcgill.ca` / `@mail.mcgill.ca`, `#912338` for `@concordia.ca` / `@live.concordia.ca`. Check `App.jsx` for how the current logged-in user's university is determined and the theme color is derived.
- Inline styles only — no new CSS classes or external libraries.
- Follow existing modal open/close pattern (local `useState` boolean).
- Follow existing error/success display pattern (check how other forms in `App.jsx` show errors).

### Outputs
- Updated `frontend/src/App.jsx` (or equivalent entry point): new routes, "Forgot password?" link, block/report state updates.
- New `ForgotPasswordPage` component (inline in App.jsx or as `frontend/src/pages/ForgotPasswordPage.jsx`).
- New `ResetPasswordPage` component (inline in App.jsx or as `frontend/src/pages/ResetPasswordPage.jsx`).
- Updated profile edit section in App.jsx (account deletion danger zone + modal).
- Updated `ProfileModal` component (block/report buttons + report modal).

---

## Coordination

### Parallelism
- Agent 1 has no file overlap with Agent 3. Agent 1 and Agent 2 overlap only on `main.py` (Agent 1: top section only, Agent 2: bottom section only).
- All 3 agents start simultaneously.
- Agents 2 and 3 communicate via `SendMessage` if API shape needs clarification mid-work.

### Merge & Verification (orchestrator, after all 3 agents complete)
1. Merge `main.py` changes: Agent 1's top-section edits + Agent 2's bottom-section route handlers. Verify no duplicate imports or variable names. Ensure exactly one `FRONTEND_URL` assignment exists (from Agent 2's section).
2. Generate Alembic migration for Agent 2's new models: with Agent 1's baseline already in place, run `alembic revision --autogenerate -m "add_password_reset_tokens_blocks_reports"`. Verify the generated file's `down_revision` matches Agent 1's baseline migration revision ID. Commit the migration file.
3. Run `pytest tests/` — all existing tests must pass. Note: new features may not have tests written yet; this verifies no regressions.
4. Run `npm run build` in `frontend/` — must compile with no errors.
5. Manual smoke test:
   - Register a new user → verify email → fill questionnaire → view matches.
   - Request password reset → use reset link → log in with new password.
   - View a match's profile modal → block them → confirm they disappear from list.
   - View a match's profile modal → report them → confirm toast shows.
   - Go to profile edit → delete account → confirm redirect to landing page.
6. Flag any failures to the appropriate agent for fixing.

---

## Out of Scope (not in this spec)
- Admin panel
- WebSocket real-time chat
- Analytics / monitoring (Sentry, etc.)
- Phone verification
- Search / filter
- Caching
- Frontend tests (Cypress/Playwright)
- API versioning (`/api/v1/`)
- Moderation tooling beyond block/report submission
