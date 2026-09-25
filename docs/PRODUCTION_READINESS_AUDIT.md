# MatchMyRoom production readiness audit

Reviewed on 2026-09-21 against commit `4693aa8`. Public website: https://matchmyroom.ca/.

**Decision: do not launch broadly yet.** The immediate login failure is a broken Railway API hostname. Independently, the current code has database-destruction paths, incomplete UUID migration, and missing student-safety flows. Hosting the current revision successfully would not resolve these defects.

This is an assessment and implementation sequence, not a deployment. No production credentials, accounts, database contents, or hosting settings were changed. Public HTTP checks and isolated local probes were used; backend startup hooks were deliberately not executed. Production database schema, backups, RLS, SMTP configuration, Railway account status, and real-user login remain unverified.

## 1. Confirmed cause of the deployed login error

The public HTML is served by Vercel. Its deployed JavaScript bundle (`/assets/index-BIcYzNPg.js`) contains this API base:

```text
https://matchmyroom-production.up.railway.app/api
```

The active login flow is in `frontend/src/App.jsx:478`: Supabase password sign-in is followed by a POST to `${API_BASE}/auth/sync-user`. That POST carries an Authorization header and requires a successful browser CORS preflight.

| Public check | Observed result |
| --- | --- |
| `GET https://matchmyroom.ca/` | HTTP 200, Vercel |
| Railway `GET /api/ping` | HTTP 404, `Application not found`, Railway edge response |
| Railway `GET /api/health` | Same HTTP 404 |
| Railway `OPTIONS /api/auth/sync-user`, origin `https://matchmyroom.ca` | HTTP 404, no `Access-Control-Allow-Origin` |
| Supabase project JWKS endpoint | HTTP 200, ES256 signing key |
| `GET https://matchmyroom.ca/api/ping` | Vercel HTTP 404; no working same-origin API fallback |

This identifies a failure before a request reaches FastAPI. The browser rejects the preflight and the catch block at `frontend/src/App.jsx:511` displays “Network error. Please try again.” The public evidence cannot distinguish a removed service, changed domain, disabled deployment, or another Railway routing/account issue. Inspect the Railway dashboard and deployment logs to establish that account-side cause. Supabase JWKS availability does not prove an end-to-end password login succeeded.

Repair the backend service/domain, obtain its actual public HTTPS URL, set Vercel's production `VITE_API_URL` to that URL **including `/api`**, then rebuild/redeploy the frontend. Vite embeds this variable during the build; editing a variable without rebuilding the bundle does not update existing browser code. [Vite environment documentation](https://vite.dev/guide/env-and-mode).

## 2. Architecture actually used

```text
Student browser
  ├─ Vercel: React/Vite frontend, matchmyroom.ca
  ├─ Supabase Auth: signup, email verification, login, token refresh
  └─ FastAPI: profile sync, profiles, questionnaires, matches, messages
       ├─ SQLAlchemy → DATABASE_URL
       ├─ Cloudinary → profile pictures
       ├─ Resend/SMTP → notification emails
       └─ Anthropic → optional match explanation endpoint
```

`frontend/src/main.jsx` imports the 1,864-line `App.jsx`. That file defines its own pages and authentication logic. The separate `src/pages`, `src/hooks/useAuth.js`, and `src/utils/api.js` implementations are not wired into that application. Editing those files alone would not fix the deployed login flow.

The backend's database location is controlled by `DATABASE_URL`; Supabase Auth does not automatically put SQLAlchemy's application tables in Supabase. The local backend environment uses SQLite, while current models use PostgreSQL UUID columns. The production database location cannot be determined from the public website.

## 3. Fix before attaching production data or admitting students

### P0 — Destructive startup and incompatible migration history

- `backend/alembic/versions/c3d4e5f6a7b8_truncate_users_cascade.py:24` runs `TRUNCATE users CASCADE`. Applying this pending migration deletes application users and dependent data. It runs when that revision is applied, not necessarily on every restart.
- `backend/app/main.py:175` drops and recreates all modeled tables when an old `password_hash` column is detected.
- The baseline migration creates integer user IDs and password-auth columns, while `backend/app/models.py:15` expects Supabase UUID identities and no password hash.
- `backend/app/database.py:50` automatically upgrades to head at startup, then falls back to `create_all` on failure. Startup catches additional errors and continues. This can hide a partially migrated or unusable database.

**Required:** inventory the existing database and `alembic_version`, back it up, and rehearse on a disposable copy. Remove destructive automatic reset behavior. Create a reviewed migration strategy that preserves users and foreign keys; mapping integer IDs to Supabase identities needs an explicit mapping, not an integer-to-UUID cast. Run migrations once in a release step and fail the release if they fail. Do not run the current migration chain against valuable data.

### P0 — UUID migration breaks core authenticated requests

ORM user IDs are UUID objects, but most route parameters and request schemas are strings. Checks such as `current_user.id != user_id` therefore reject the owner.

Isolated FastAPI probes with a synthetic authenticated UUID user reproduced HTTP 403 for that same user's matches, questionnaire submission, profile update, and account deletion. No production database or token was used.

Evidence: `backend/app/main.py:303`, `:430`, `:552`, `:915`, `:1416`; also block/report routes. Pair normalization at `:519` compares a string and UUID with `min`/`max`, which raises `TypeError`. Several partner-ID comparisons and block membership checks have the same mismatch.

**Required:** use `uuid.UUID` consistently for user IDs at request boundaries and internally. Preserve integer IDs for records that still use integer primary keys, such as messages and match rows. Let JSON serialization produce strings for UUIDs. Cover both valid ownership and forbidden cross-user actions.

### P0 — Response schemas reject actual database values

`backend/app/schemas.py` declares user UUIDs and integer record IDs as `str`. Current Pydantic rejects those inputs: local probes reproduced validation failures in `UserProfile`, `MatchResponse`, and `MessageResponse`. For example, profile construction at `backend/app/main.py:279` passes the ORM UUID directly. These failures remain after fixing ownership checks.

**Required:** match response schemas to ORM types: UUID for identity fields and int for integer row IDs. Test actual serialized endpoint responses with PostgreSQL-backed records.

### P1 — University access is not enforced consistently

The frontend allowlist is bypassable by direct Supabase signup. Backend sync validates the domain only when the application user does not already exist (`backend/app/main.py:1376`). The SQL signup trigger inserts every signup and classifies all non-Concordia domains as McGill (`backend/supabase_schema.sql:13`). If that trigger is installed in the database used by FastAPI, the existing-user path skips the domain check.

**Required:** restrict signup with a Supabase Before User Created hook, keep email confirmation required, and enforce eligible email domains in trusted backend authentication for existing users as well. Handle email changes consistently. Decide whether alumni/staff addresses qualify: access to a university mailbox is not proof of current enrollment. [Supabase domain restriction hooks](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook).

The token verifier at `backend/app/main.py:98` hardcodes one project's JWKS URL, disables audience verification, and does not configure an expected issuer. Derive configuration from the intended Supabase project, verify expected issuer/audience and required expiry/subject claims, and return a generic authentication failure rather than raw exception text. This is hardening of an existing signature check, not evidence that arbitrary unsigned tokens are accepted.

### P1 — Student safety and account lifecycle are incomplete

- The running `App.jsx` has no wired password-recovery, account-deletion, block, or report flow; separate page files contain some of this work but are not rendered by the active app.
- `delete_account` removes application records and attempts photo deletion, but does not delete the Supabase Auth identity. After the UUID bug is fixed, another login could recreate the application profile.
- `get_profile` returns another user's email to any authenticated caller with the ID, without checking blocks. Message-thread retrieval also lacks a block check. Breakdown access does not require a match or block check.
- Message sending checks recipient existence and blocks, but does not require a mutual match. Decide the intended contact policy and enforce it consistently across REST and WebSocket paths.
- Reports can be stored, but no moderation review or suspension workflow is present in this code.

**Required:** wire these flows into the active frontend, centralize visibility/contact/block authorization, limit returned personal data, and implement account deletion across Supabase Auth, application data, and images with retry/reconciliation. Test that a blocked account cannot contact a user through any supported channel.

### P1 — Matching choices mean different things in browser and backend

The active questionnaire uses `genderPreference = 2` for “Non-binary” and `3` for “No preference” (`frontend/src/App.jsx:239`). Backend `_gender_score` and labels treat `2` as “No preference” (`backend/app/matching.py:8`, `:410`). Local probes showed two “No preference” users receiving 0 of 20 gender points, while two users selecting the non-binary preference could receive full points for a male/female pairing.

The request schema accepts `{responses: {}}`, and two empty questionnaires score 77%. The submission handler marks a questionnaire complete without verifying required answers. The active questionnaire also omits the apartment and pets questions supported elsewhere in the code. Recalculation only writes scores above 50; it does not remove previously stored matches whose score drops below the threshold. Candidate selection is capped at 500 without a stable paging/selection strategy.

**Required:** establish one versioned question contract with stable option values; migrate existing answers where needed; validate completeness, ranges, and custom-text lengths server-side. Define actual dealbreakers separately from weighted preferences. Update or remove obsolete matches on retakes, and test current UI values rather than only legacy fixtures.

## 4. Hosting and deployment recommendation

Keep Vercel for the frontend. Run the existing FastAPI service on Railway. Use one Supabase project for Auth and the application's Postgres database unless an existing production database requires a preservation/migration phase. Keep Cloudinary and Resend already integrated. This minimizes simultaneous infrastructure changes.

For a new database, consider Supabase's specific Canada Central region; choose backend placement near the database after measuring latency. Existing project region and other vendors' data locations need separate verification. A Canadian database alone does not establish that all processing stays in Canada. [Supabase regions](https://supabase.com/docs/guides/platform/regions).

**Configure Railway after repairing startup/migrations:**

| Setting | Recommended value or action |
| --- | --- |
| Source root | `backend` |
| Build | Existing Dockerfile, with dependency and build-context fixes below |
| Initial process | One Uvicorn worker, one service replica |
| Port | Existing Docker command binds `0.0.0.0:8000`; set `PORT=8000` and domain target port 8000, or update all three consistently |
| Public domain | First verify generated HTTPS domain; then optionally use `api.matchmyroom.ca` |
| Database | Supabase Postgres connection string, stored only as a backend secret |
| Release migration | Reviewed migration command, executed once; not the present unsafe chain |
| Readiness | `/api/health`, after changing it to return HTTP 503 on database failure |
| Availability | Keep production continuously available; configure resource and spending limits |

The existing `backend/Procfile` uses `$PORT`, but the Dockerfile fixes port 8000. Verify which start mechanism Railway actually uses instead of assuming the Procfile wins. [Railway FastAPI deployment](https://docs.railway.com/guides/fastapi).

For a persistent backend, use Supabase's direct connection when network support permits; use the session pooler when an IPv4 connection is needed. Copy the exact string from the project's Connect dialog, configure SSL, bound the SQLAlchemy pool, and use a least-privileged runtime role. Use a migration connection appropriate for administrative operations. [Supabase connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres).

**Backend configuration inventory:**

```dotenv
ENV=production
PORT=8000
DATABASE_URL=<backend-only PostgreSQL connection string>
SUPABASE_URL=https://<project-ref>.supabase.co
ALLOWED_ORIGINS=https://matchmyroom.ca
APP_URL=https://matchmyroom.ca
FRONTEND_URL=https://matchmyroom.ca
CLOUDINARY_CLOUD_NAME=<configured cloud>
CLOUDINARY_API_KEY=<backend secret>
CLOUDINARY_API_SECRET=<backend secret>
RESEND_API_KEY=<backend secret>
FROM_EMAIL=<verified sender on your domain>
```

These are intended settings, not a claim that all are honored today. Currently JWKS is hardcoded and CORS ignores `ALLOWED_ORIGINS`; fix that code. Email notifications use `APP_URL`, while the examples mainly document `FRONTEND_URL`. Keep one canonical URL in the repaired configuration. An admin credential for deleting Supabase identities belongs only on the backend. The old `JWT_SECRET` example does not configure the current JWKS verifier.

**Vercel configuration:** root `frontend`, install `npm ci`, build `npm run build`, output `dist`, and these build variables:

```dotenv
VITE_API_URL=https://<actual-working-api-domain>/api
VITE_SUPABASE_URL=https://<same-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<public anon/publishable key>
```

The public anon/publishable key is expected in browser code; service/admin credentials are not. `frontend/.env.example:1` currently omits `/api` and would produce incorrect route URLs. Vite's development proxy and Docker Nginx's `backend:8000` proxy do not configure Vercel production routing. Either keep an explicit HTTPS API base as above or deliberately add and verify a same-origin rewrite.

Railway's Hobby plan has a $5 USD monthly minimum including $5 usage; Pro has a $20 minimum including $20 usage. Supabase Pro starts at $25 USD/month. Thus $30/month is a base combination for Hobby plus Supabase Pro, or $45 for Railway Pro plus Supabase Pro, before additional usage and frontend, email, image, monitoring, tax, or domain charges. These are provider starting prices, not a measured total for this app. [Railway billing](https://docs.railway.com/pricing/understanding-your-bill), [Supabase pricing](https://supabase.com/pricing).

## 5. Operational and privacy work before public launch

- **CORS:** `backend/app/main.py:62` permits `*` while logging configured origins. Wire the allowlist to middleware and test the real origin plus an unrelated origin. Changing the environment alone currently has no effect. CORS is browser policy, not a replacement for backend authorization.
- **Database access:** the repository has no RLS policies. If application tables are placed in an exposed Supabase schema, explicitly secure Data API access with RLS/grants or use a non-exposed application schema. Verify live settings with the anon and authenticated roles. Absence of repository policies does not prove the current production database is publicly readable. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- **Auth email:** configure production SMTP inside Supabase Auth, separately from FastAPI's notification email settings. The default Supabase sender is for non-production use. Align confirmation templates and OTP length with the app, configure redirect URLs, and test delivery to both universities. Configure SPF/DKIM/DMARC for the sender domain. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- **Readiness:** current `/api/health` returns HTTP 200 even when its database query fails, including raw exception text. A local probe confirmed this. Return a safe HTTP 503 response instead; keep `/api/ping` for process liveness. Railway deployment healthchecks are not continuous uptime monitoring, so add external monitoring and alerts. [Railway healthchecks](https://docs.railway.com/deployments/healthchecks).
- **Dependencies:** `npm audit` reported 17 affected package entries: 13 high, 3 moderate, 1 low. This includes development/build tooling and framework modes not necessarily used by this static SPA; it is not proof of 13 exploitable production vulnerabilities. Upgrade and triage reachable paths with build/regression checks. Backend pins `python-multipart==0.0.6`, in the affected range of a documented multipart DoS; update to a currently supported patched version and audit the full resolved Python environment. [Maintainer advisory](https://github.com/Kludex/python-multipart/security/advisories/GHSA-59g5-xgcq-4qw3).
- **Secrets/builds:** no `.dockerignore` was found. Local Docker builds using `COPY . .` can include `.env`, local databases, and unwanted files. Add explicit exclusions and use hosting secrets. Environment files are Git-ignored in the inspected checkout; this review did not establish any secret leak or audit all Git history.
- **Error handling:** profile save at `frontend/src/App.jsx:1595` displays success without checking HTTP status. Centralize API error handling, distinguish authentication, network, validation, and service failures, add timeouts, and avoid turning a temporary backend/JWKS problem into an unconditional logout.
- **Messaging:** the active frontend polls; it does not use `useWebSocket`. The unused hook hardcodes `ws://localhost:8000`. Server socket connections and rate limits are process-local. Keep one process initially; before adding workers/replicas, add shared rate limiting and message delivery or adopt a managed realtime mechanism. Socket messages and typing events need authorization/rate limits, disconnect cleanup, and expired-session handling. Do not put bearer tokens into retained access logs.
- **Scaling:** conversation previews load the entire user's message history into Python every poll. Move preview/unread aggregation into bounded SQL queries. Add uniqueness constraints for match pairs, swipe pairs, and one questionnaire per user; make profile synchronization idempotent under simultaneous login/session requests. Use a durable queue/outbox for notification emails instead of untracked daemon threads when reliable delivery is required.
- **Photos:** Cloudinary upload currently accepts moderation statuses other than an immediate rejection, and deletes the old photo before a successful replacement. Verify moderation provisioning/completion, image size and content validation, and failure behavior.
- **Optional AI:** explanation generation calls `get_question_text(key)` without the required option argument (`backend/app/main.py:680`); an isolated call reproduces `TypeError`. Disable or repair this endpoint before advertising it. Document any transfer of questionnaire data to the AI provider and minimize what is sent.
- **Privacy/student launch:** the app collects religious preference and dietary/allergy information, among other personal data; some questions do not affect the current scoring algorithm. Reassess necessity and optionality. Provide accurate privacy information, retention/deletion procedures, a contact for privacy requests, and a moderation/incident process. Review Quebec obligations and cross-border processing with appropriate expertise. CAI emphasizes necessity, transparency, and disclosure of possible processing outside Quebec. [CAI collection guidance](https://www.cai.gouv.qc.ca/protection-renseignements-personnels/information-entreprises-privees/collecte-renseignements-personnels_entreprises).

## 6. Verification performed

| Check | Result |
| --- | --- |
| Public website, API, preflight, JWKS probes | Results in section 1 |
| `cd frontend && npm run build` | Passed, Vite 5.4.21 |
| Frontend lint | 35 errors and 10 warnings |
| `.venv/bin/python -m pytest tests/ -q --tb=short` | Collection fails: `tests/conftest.py:21` imports removed `create_token`; it also references removed `pwd_context` and old auth fields |
| `.venv/bin/python -m pytest --noconftest tests/test_matching.py -q --tb=short` | 58 passed; legacy option assumptions mean this does not validate the current questionnaire contract |
| Isolated authenticated endpoint probes | Own-account requests incorrectly return 403 |
| Pydantic response probes | UUID/integer inputs rejected by string fields |
| SQLite schema compilation | Fails on PostgreSQL-specific UUID type with installed SQLAlchemy 2.0.23 |
| Simulated DB failure | `/api/health` incorrectly returns HTTP 200 |
| Unrelated-origin preflight against local app | Allowed with `*` |
| Current matching inputs | “No preference” scored incorrectly; empty pair scores 77%; empty submission accepted |
| `npm audit --json` | 17 affected package entries; no auto-fixes applied |

Local Python was 3.9.6; deployment Docker/CI specify 3.11. A fresh Python 3.11 container build, full Python vulnerability scan, real PostgreSQL migration rehearsal, load test, email delivery test, and end-to-end browser login were not performed. No authenticated access to Railway/Vercel/Supabase management settings was used.

## 7. Recommended implementation order and release gate

1. Inspect Railway's actual service/domain and account/deployment state. Identify and back up the existing application database and Supabase identities before any redeploy that starts the present migration code.
2. Remove destructive startup behavior; implement and rehearse a safe schema migration. Standardize UUID boundaries and response types, and restore PostgreSQL-based API tests in CI.
3. Repair the active frontend API configuration/error handling, domain eligibility, account sync, email confirmation/recovery, and student safety/account deletion flows. Correct the shared questionnaire contract and validation.
4. Deploy an isolated staging backend, verify database readiness and CORS, then set the working production API URL in Vercel and rebuild. Verify the new public bundle no longer references an obsolete domain.
5. Test with authorized McGill and Concordia test accounts: signup, email verification, login, refresh, recovery, questionnaire, matching, photo upload, mutual contact policy, blocking/reporting, and complete deletion. Verify expired tokens, wrong-user IDs, non-university accounts, and duplicate requests are rejected or handled correctly.
6. Test restart/redeploy without data loss; restore a backup; force a database outage and observe HTTP 503 plus alerts. Add frontend build/lint and PostgreSQL integration tests to `.github/workflows/ci.yml`; require relevant checks before deployment.
7. Run a small invited pilot at both universities, monitor failure rates and response times, and load-test the expected concurrent usage before widening access. Do not infer a supported user count merely from the host's plan size.

The immediate recovery milestone is a successful real login through a verified HTTPS API. The student-launch milestone additionally requires data preservation, correct authorization and matching, reachable account/safety flows, reliable email, and observable failures.
