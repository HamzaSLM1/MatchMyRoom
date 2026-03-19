# MatchMyRoom Production Readiness — Design Spec
**Date:** 2026-03-19
**Scope:** Critical + High priority fixes for launch to hundreds of users
**Approach:** Option A — Layer-based split across 3 parallel subagents

---

## Overview

The app's core features (auth, matching, swipes, messaging) are working. This spec covers the infrastructure, backend features, and frontend work needed to make it production-safe for hundreds of real users. Work is divided into 3 independent agents that run in parallel.

---

## Agent 1 — Infrastructure

### Responsibility
Everything needed for the app to run reliably in a hosted production environment.

### Tasks

#### 1. PostgreSQL Migration
- Change `DATABASE_URL` in `backend/app/database.py` from hardcoded SQLite path to `os.getenv("DATABASE_URL")`.
- Add `psycopg2-binary` to `backend/requirements.txt`.
- Replace `ALTER TABLE` hacks in `init_db()` with proper Alembic setup:
  - `alembic init backend/alembic`
  - Write initial migration reflecting current schema (users, matches, likes, messages, email_verifications).
  - All future schema changes go through Alembic migrations.

#### 2. Dockerfile + docker-compose
- `backend/Dockerfile`: Python 3.11-slim base, install deps, copy app, expose 8000, run via uvicorn.
- `frontend/Dockerfile`: Node 20 build stage, nginx serve stage.
- `docker-compose.yml` at repo root:
  - `db`: postgres:15, volume for persistence, env vars from `.env`
  - `backend`: builds from `backend/Dockerfile`, depends_on db, reads `.env`
  - `frontend`: builds from `frontend/Dockerfile`, proxies `/api` to backend

#### 3. CORS Fix
- In `backend/app/main.py`, replace hardcoded localhost list with:
  ```python
  ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
  ```

#### 4. JWT Startup Validation
- In `backend/app/main.py`, add startup check: if `JWT_SECRET` is not set as an environment variable, log a fatal error and raise `RuntimeError` — refuse to start rather than silently generating a random secret per restart.

#### 5. `.env.example`
Create `.env.example` at repo root documenting every required variable:
```
DATABASE_URL=postgresql://user:password@localhost:5432/matchmyroom
JWT_SECRET=your-secret-here-min-32-chars
ALLOWED_ORIGINS=https://yourdomain.com
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

### Outputs
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-compose.yml`
- `.env.example`
- Updated `backend/app/database.py`
- Updated `backend/app/main.py` (CORS + JWT validation)
- `backend/alembic/` folder with initial migration
- Updated `backend/requirements.txt`

---

## Agent 2 — Backend Features

### Responsibility
New API endpoints and algorithm bug fixes. Works in parallel with Agent 1 (no file overlap) and Agent 3 (shares API contracts below).

### API Contracts (shared with Agent 3)

| Endpoint | Method | Auth | Request Body | Response |
|---|---|---|---|---|
| `/api/auth/forgot-password` | POST | None | `{email: str}` | `{message: str}` |
| `/api/auth/reset-password` | POST | None | `{token: str, new_password: str}` | `{message: str}` |
| `DELETE /api/users/{user_id}` | DELETE | JWT | — | `{message: str}` |
| `POST /api/users/{user_id}/block` | POST | JWT | `{blocked_user_id: int}` | `{message: str}` |
| `DELETE /api/users/{user_id}/block/{blocked_user_id}` | DELETE | JWT | — | `{message: str}` |
| `POST /api/users/{user_id}/report` | POST | JWT | `{reported_user_id: int, reason: str}` | `{message: str}` |

### Tasks

#### 1. Password Reset
- Add `password_reset_tokens` table: `id`, `user_id` (FK), `token` (unique, indexed), `expires_at`, `used` (bool).
- `POST /api/auth/forgot-password`: look up email, generate `secrets.token_urlsafe(32)`, store in table with 1-hour expiry, send reset email via existing email service.
- `POST /api/auth/reset-password`: validate token exists + not expired + not used, hash new password with bcrypt, update user, mark token `used=True`.
- Add SQLAlchemy model + Pydantic schema for the new table.

#### 2. Account Deletion
- `DELETE /api/users/{user_id}`: verify JWT matches user_id, then cascade delete in order: messages → likes → matches → email_verifications → password_reset_tokens → profile photo (Cloudinary) → user row.
- Return `{message: "Account deleted"}` on success.

#### 3. Block / Report
- Add `blocks` table: `blocker_id` (FK), `blocked_id` (FK), `created_at`. Composite PK on (blocker_id, blocked_id).
- Add `reports` table: `id`, `reporter_id` (FK), `reported_id` (FK), `reason` (str), `created_at`.
- `POST /api/users/{user_id}/block`: insert into blocks.
- `DELETE /api/users/{user_id}/block/{blocked_user_id}`: remove from blocks.
- `POST /api/users/{user_id}/report`: insert into reports.
- Update `GET /api/matches/{user_id}` to exclude blocked users from results.
- Update `GET /api/messages/threads/{user_id}` to exclude blocked users from threads.

#### 4. Rate Limiting Gaps
Add `@limiter.limit()` decorators to currently unprotected endpoints:
- Profile picture upload: `3/minute`
- Message send: `30/minute`
- Match calculation: `5/minute`
- Swipe record: `60/minute`

#### 5. Matching Algorithm Bug Fixes
- **Bug 1 (lifestyle scoring):** In `matching.py`, Case 3 (both looking) uses inline lifestyle logic instead of `_lifestyle_score()`. Replace with the helper call to ensure consistent None-handling.
- **Bug 2 (gender preference index):** Default for `genderPreference` is index 3 but "No preference" in UI is index 2. Change default to `2` to match UI.

#### 6. File Upload MIME Validation
- In the profile picture upload endpoint, check `file.content_type in {"image/jpeg", "image/png", "image/webp"}` before passing to Cloudinary. Return HTTP 400 with `{detail: "Only JPEG, PNG, and WebP images are allowed"}` if invalid.

### Outputs
- Updated `backend/app/main.py` (new endpoints, rate limits, file validation)
- Updated `backend/app/models.py` (password_reset_tokens, blocks, reports)
- Updated `backend/app/schemas.py` (new Pydantic schemas)
- Updated `backend/app/matching.py` (bug fixes)

---

## Agent 3 — Frontend

### Responsibility
UI for the 3 new user-facing features. Uses API contracts from Agent 2. Works in parallel with Agents 1 and 2.

### Tasks

#### 1. Password Reset Flow
- Add "Forgot password?" link on the login form.
- New `ForgotPasswordPage`: single email input, submit calls `POST /api/auth/forgot-password`, shows success message ("Check your email for a reset link").
- New `ResetPasswordPage`: reads `?token=` from URL query params, shows new password + confirm password inputs, submits to `POST /api/auth/reset-password`, on success redirects to login with a success toast.
- Follow existing page routing pattern in `frontend/src/App.jsx`.

#### 2. Account Deletion
- In `ProfileEditPage` (or equivalent profile edit view), add a "Delete Account" section at the bottom with a red "Delete My Account" button.
- Clicking opens a confirmation modal: "This will permanently delete your account and all your data. This cannot be undone."
- Two buttons: "Cancel" and "Delete Forever" (red).
- On confirm: call `DELETE /api/users/{user_id}` with auth, clear `mmr_token` + `mmr_user` from localStorage, redirect to landing page `/`.

#### 3. Block / Report
- In `ProfileModal` (the card detail overlay), add two new action buttons: "Block" and "Report".
- **Block:** calls `POST /api/users/{user_id}/block`, removes the blocked user from the match list in local state (no page reload needed), shows brief toast "User blocked".
- **Report:** opens a small modal with a reason dropdown: "Harassment", "Fake Profile", "Inappropriate Content", "Other". Submit calls `POST /api/users/{user_id}/report`, shows toast "Report submitted".

#### 4. Style Consistency
- All new pages and modals must use existing inline style patterns.
- Use `theme.primary` (McGill red `#c8102e` / Concordia maroon `#912338`) for accent colors — determined by the logged-in user's university, as per existing pattern.
- No new CSS files or style libraries.

### Outputs
- Updated `frontend/src/App.jsx` (new routes)
- New `frontend/src/pages/ForgotPasswordPage.jsx`
- New `frontend/src/pages/ResetPasswordPage.jsx`
- Updated profile edit page (account deletion section)
- Updated `frontend/src/components/ProfileModal.jsx` (block/report buttons + report modal)

---

## Coordination

### Parallelism
- Agent 1 has zero file overlap with Agents 2 and 3 — fully independent.
- Agents 2 and 3 share only the API contract table. Agent 3 can build UI against the contracts immediately without waiting for Agent 2 to finish.
- Agents 2 and 3 use `SendMessage` to communicate if API shape needs clarification mid-work.

### Merge & Verification (post-agent)
After all 3 agents complete, the orchestrator:
1. Checks for file conflicts.
2. Runs `pytest tests/` to verify backend tests pass.
3. Runs `npm run build` in `frontend/` to verify frontend compiles.
4. Flags any issues back to the appropriate agent for fixing.

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
