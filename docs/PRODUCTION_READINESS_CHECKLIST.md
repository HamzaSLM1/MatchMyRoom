# Production readiness checklist

Tracks every finding in `PRODUCTION_READINESS_AUDIT.md` (audit dated 2026-09-21 against
commit `4693aa8`).

**Status legend**

| Mark | Meaning |
| --- | --- |
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Implemented **and** verified locally (evidence recorded) |
| `[A]` | Implemented, awaiting external (staging/production) verification |
| `[B]` | Blocked on access or a decision the owner must make |

**Verification tiers.** `local` = runs on this machine. `staging` = runs against a deployed
non-production environment. `production` = runs against the live site. Nothing is claimed as
production-verified without a recorded live check.

---

## Test-suite-driven findings (step 4 — after the test rewrite, before final commit)

The `test-suite-repair` subagent's rewrite surfaced 3 genuine, previously-undetected app bugs
via real reproduction (not guesses) — all now fixed and confirmed by a clean test run
(**145 passed, 0 failed** — no more xfail markers needed):

- **`GET /api/profile/{user_id}` and `GET /api/messages/conversations/{user_id}` and
  `GET /api/messages/thread/{user_id}/{other_user_id}` were 500ing on every real response** —
  `schemas.py`'s `UserProfile.id`, `MatchResponse.id`/`user_id`, `SwipeHistoryItem.user_id`,
  `ConversationPreview.user_id`, and `MessageResponse.id`/`sender_id`/`recipient_id` are all
  typed `str`, but `main.py` passed raw ORM values (`uuid.UUID` for ids, `int` for
  `Match.id`/`Message.id`) straight into those pydantic models without `str()`. Pydantic v2
  does not silently coerce `UUID`/`int` into `str`, so every one of those response
  constructions raised a validation error. Fixed by wrapping every id in `str()` at each
  construction site; `get_message_thread` now builds `MessageResponse` objects explicitly
  instead of returning raw ORM rows through `response_model`.
- **`POST /api/matches/calculate` (and the internal `_recalculate_matches_for_user`) crashed
  with `TypeError` for any pair scoring >50** — `min(user_id, other_user.id)` /
  `max(...)` compared a `str` route param against a `uuid.UUID` ORM attribute, which Python
  cannot order. Fixed by comparing `min(user_id, str(other_user.id))` at both sites.
  `explain_match`'s identical-looking `min(user_id, other_user_id)` was checked and is fine —
  both its params are already `str`.
- **Blocking only worked in one direction, and the "block" check on both
  `POST /api/messages/send` and the WebSocket message handler was already separately broken
  by the UUID/str comparison bug I'd found earlier** — `utils.py::get_blocked_user_ids()`'s
  ternary `b.blocked_id if b.blocker_id == user_id else b.blocker_id` compared a `uuid.UUID`
  to the caller's raw `str`, always false, so it always returned `b.blocker_id` — correct
  only when the caller was the *blocked* party, useless when the caller was the *blocker*.
  Fixed by comparing `str(b.blocker_id) == user_id`. This also fixes `get_conversations`'
  partner-attribution, which had the same-shaped bug (`msg.sender_id == user_id` comparing
  UUID to str) and was silently always assuming the viewer was the message recipient.
- Also found while auditing the same code paths: `is_online` in `get_profile` compared
  `user.id` (UUID) against `ws_manager.active_connections`' `str`-keyed dict — always False,
  so online status never showed as online. Fixed with `str(user.id)`.

Verified locally: full run of `pytest tests/` → **145 passed, 0 failed, 0 xfailed** (was 137
passed / 8 xfailed before these fixes — every xfail flipped to a genuine pass). Not yet
verified against Postgres or a live deployment (B1).

## Audit validation (step 3 — done before any change)

Findings re-checked against the code at `4693aa8` before editing:

| Audit claim | Verified? | Evidence |
| --- | --- | --- |
| Deployed bundle calls the Railway `/api` base | yes | live bundle `/assets/index-BIcYzNPg.js` contains `https://matchmyroom-production.up.railway.app/api` |
| Railway returns 404 `Application not found` | yes | re-checked live; still 404, Railway trial expired (owner screenshot) |
| `schemas.py` types identity/row IDs as `str` | yes | `schemas.py` lines 13, 36-37, 47-48, 69, 81-83, 93, 114, 127 |
| Startup `drop_all` on `password_hash` detection | yes | `main.py` ~176 |
| `TRUNCATE users CASCADE` migration | yes | `alembic/versions/c3d4e5f6a7b8_truncate_users_cascade.py:24` |
| CORS hardcodes `*`, ignores `ALLOWED_ORIGINS` | yes | `ALLOWED_ORIGINS` built at `main.py:36`, unused; `allow_origins=["*"]` at `main.py:59` |
| Ownership checks compare UUID to `str` | yes | 18 sites of `current_user.id != user_id`; route params annotated `user_id: str` |
| `/api/health` returns 200 + raw exception on DB failure | yes | `main.py` health_check except-branch returns `str(e)` with HTTP 200 |
| genderPreference meaning mismatch | yes | frontend options `["Male","Female","Non-binary","No preference"]` (index 2 = Non-binary); `matching.py:8` treats `2` as No preference |
| AI explain calls `get_question_text(key)` with 1 arg | yes | call site `main.py:680`; signature `matching.py:397` requires `(question_id, option_index)` |
| Test suite fails to collect | yes | `tests/conftest.py:21` imports removed `create_token`, `pwd_context` |

Corrections to the audit found during validation:

- Tests live at repo-root `tests/`, not `backend/tests/`.
- There is no `.github/workflows/ci.yml` in the repo, so audit step 6's "add to CI" is a
  create-from-scratch task, not an edit.

---

## 1. Frontend-to-backend connection

- [B] Re-establish a reachable backend service and public HTTPS domain — owner chose to pay for
  Railway Hobby (~$5/mo); needs the owner to actually restore billing/the service (B1).
- [ ] Align Docker start command / listening port / `PORT` / public target port
- [ ] `VITE_API_URL` set consistently, `/api` exactly once
- [x] Fix misleading `frontend/.env.example` (currently omits `/api`) — confirmed
  `App.jsx`'s `API_BASE = import.meta.env.VITE_API_URL || "/api"` never appends `/api` itself,
  so the env var must include it. Updated the example from
  `http://localhost:8000` to `http://localhost:8000/api`.
- [ ] Startup validation rejects missing/localhost API base in production builds
- [ ] Rebuild frontend after env change; verify bundle contains intended URL
- [x] CORS honours `ALLOWED_ORIGINS` allowlist — `main.py` no longer hardcodes
  `allow_origins=["*"]`; it now passes the parsed `ALLOWED_ORIGINS` list (comma-split, trimmed,
  empty entries dropped). Verified locally via code read + syntax check only — not yet verified
  with a real cross-origin browser request (needs a reachable deployment, B1).
- [ ] Verify real browser preflight + authenticated sync against staging

## 2. Database initialization and migrations

- [x] **(fixed by peer session `test-suite-repair`, verified against disposable Postgres)**
  `c3d4e5f6a7b8_truncate_users_cascade.py`'s `upgrade()` ran `TRUNCATE users CASCADE` —
  combined with `database.py::init_db()` now unconditionally running `alembic upgrade head`
  on startup (my own earlier fix, section above), this was a live landmine: if production's
  `alembic_version` was ever behind this revision, the next deploy would wipe every user.
  Neutralized to a no-op (revision node kept so anything already stamped past it is
  unaffected). Separately found the baseline migration (`a1b2c3d4e5f6`) hand-wrote the *old*
  pre-Supabase schema (integer id, `password_hash`) — nothing like current `models.py` —
  so a fresh Postgres would get a schema the ORM can't use at all; rewritten to build from
  `Base.metadata.create_all(checkfirst=True)` instead, with an explicit caveat that it does
  NOT migrate an existing old-shape `users` table (that needs a reviewed int→UUID mapping
  decision, not something to assume). Also fixed `alembic/env.py` passing `DATABASE_URL`
  straight into `ConfigParser.set()`, which crashes on a literal `%` in the DSN. Added
  `tests/test_migrations.py`: a static AST scan that fails on `TRUNCATE`/`DROP DATABASE`/
  unconditional `DELETE FROM` in any migration, plus 3 opt-in tests (via `TEST_POSTGRES_URL`,
  never `DATABASE_URL`) that ran `alembic upgrade head` against a real disposable Postgres
  and confirmed: fresh DB gets the correct UUID schema, existing data survives an upgrade,
  re-running upgrade is idempotent. Verified: **148 passed, 3 skipped** (skips are exactly
  those 3 Postgres-only tests when `TEST_POSTGRES_URL` isn't set).
  **Still needed from whoever has Railway/Supabase access, before the next deploy**: check
  `SELECT * FROM alembic_version;` and `\d users` on the real database, and take a backup,
  before letting `init_db()` run there again.
- [x] Remove `drop_all` / TRUNCATE / emergency reset from startup — `main.py` `startup_event()`
  no longer probes for `password_hash` / drops tables / patches columns ad hoc; schema changes
  now live only in Alembic migrations. Verified locally: file parses, no more `drop_all` call
  site in `main.py`.
- [x] Remove silent migration-failure fallback — `database.py::init_db()` no longer swallows an
  Alembic failure into `create_all`; it now propagates so the app fails to start rather than
  landing on an unknown schema. Verified locally (code read + syntax check); not yet verified
  against a real Postgres failure scenario (no reachable Postgres — see B1).
- [ ] Reconcile legacy integer-ID/password migrations with Supabase UUID model
- [ ] Explicit fresh-database vs existing-database handling
- [ ] Preserve data + FK relationships; no invented legacy→Supabase ID mapping
- [ ] Coherent migration history for already-migrated databases
- [ ] Migrations run once in a controlled release step, failing loudly
- [x] PostgreSQL-backed integration/migration tests — see above, `tests/test_migrations.py`
  (peer session `test-suite-repair`).
- [x] Test startup isolated from a real `DATABASE_URL` — `tests/conftest.py` now
  force-sets `DATABASE_URL` to in-memory sqlite (was `setdefault`, so an ambient real
  `DATABASE_URL` left in a dev shell, e.g. from `railway run`, would leak through and get
  migrated by the test suite's own `TestClient` via `init_db()`). Fixed by peer session.
- [ ] Uniqueness constraints added after duplicate resolution

## 3. ID types throughout the backend

- [x] UUID for user identity in route params, schemas, ORM ops, ownership, blocks, WebSocket —
  fixed all 19 sites in `main.py` comparing `current_user.id` (a `uuid.UUID`) directly to a
  `str` route param (always `!=`, causing false 403s for legitimate owners); now compares via
  `str(current_user.id) != <param>`. Also found and fixed `check_like`'s `user_id1`/`user_id2`
  route params mistyped as `int` instead of `str`. Verified locally: `ast.parse` succeeds;
  logic verified by reading each call site (`message.recipient_id != current_user.id` at line
  ~1059 was already correct — both sides are ORM `UUID` objects, left unchanged). Not yet
  verified via a live request (no reachable server — see B1).
- [ ] Integer retained where PKs are integers (messages, matches)
- [ ] Response models serialize actual DB types
- [ ] Every endpoint/helper reviewed, not only audit examples
- [ ] Owner-access and cross-user-denial both covered by tests

## 4. Supabase authentication

- [x] JWKS URL derived from configured project, not hardcoded — `main.py` now reads
  `SUPABASE_URL` (fails loudly at import time if unset, matching how `database.py` already
  validates `DATABASE_URL`) and builds the JWKS URL from it instead of hardcoding
  `jrdklvbjuavglhmdvmrd.supabase.co`. `backend/.env` already had this value set locally.
  Added `SUPABASE_URL` to both `.env.example` files, removed the now-fully-dead `JWT_SECRET`
  var (grepped: unused anywhere in `backend/app/`). Verified locally: `ast.parse` succeeds.
  Notified the test-suite-repair subagent to add this env var to its test fixtures.
- [ ] Verify signature, issuer, audience, expiry, subject
- [ ] Safe errors; no internal exception text
- [ ] Distinguish invalid credentials from provider outage
- [B] Server-side university domain enforcement incl. existing users and email changes —
  eligibility decided: current students only. Removed `@alumni.mcgill.ca` from
  `validate_university_email` (`main.py`) and the frontend's `allowedDomains` list
  (`App.jsx`). Still open: existing users already registered under a now-disallowed domain,
  and enforcement on email *changes*, are not yet handled — no such flow exists to enforce
  against yet.
- [ ] Before User Created hook (or equivalent) documented/provisioned
- [x] Signup trigger cannot classify unrelated domains as McGill — `backend/supabase_schema.sql`
  `handle_new_user()` now explicitly checks the McGill/Concordia domain lists and
  `RAISE EXCEPTION` for anything else, instead of defaulting non-Concordia emails to
  `'mcgill'`. **Not yet applied to the live Supabase project** — no dashboard access (B2);
  owner must run the updated SQL.
- [ ] Email confirmation required in production
- [ ] Idempotent, concurrency-safe account sync
- [ ] Consolidated session-sync; login/reload/refresh/expiry/logout verified
- [ ] Password recovery + callback implemented in active frontend
- [x] Document that mailbox ownership ≠ current enrolment (policy decision) — owner decided:
  current students only, no alumni domains kept.

## 5. Active frontend and error handling

- [x] Identify real runtime component tree; fix the active app — confirmed `src/main.jsx`
  renders only `App.jsx`; `src/pages/*.jsx` is never imported anywhere (grepped) and is dead
  code. All fixes in this section target `App.jsx`.
- [ ] Consistent API client and configuration — `authFetch` (adds the bearer token, handles
  401) is used for authenticated calls, but a few auth-flow requests (`sync-user`) still use
  raw `fetch`. Not unified yet.
- [ ] Accurate handling of HTTP errors, outages, malformed responses, timeouts, auth failures —
  broad item, not fully audited; see the two specific findings below for what's fixed so far.
- [x] Never show "saved" after a failed request — audited every write-path `authFetch` call
  site against `response.ok` (fetch doesn't throw on 4xx/5xx, only on network failure). Found
  and fixed two real instances: `EditProfile.handleSave` showed the success state and
  navigated to the dashboard even when the bio/picture request failed; the swipe deck's
  post-like message prompt (`handleSendPromptMessage`) silently closed and discarded the
  typed message on any failure. Other write paths (questionnaire submit, swipe like, thread
  send) already gated correctly on `response.ok`.
- [~] Loading states recover after failure — the two sites fixed above now reset their loading
  flag on failure (early `return` + `finally`) instead of hanging or falsely completing; not
  audited across the rest of the file.
- [x] No logout loop when backend is temporarily unavailable — `authFetch` forced
  `signOut()` + `window.location.reload()` on every single 401 response with no dedup; two
  polling loops (5s conversations, 10s unread count) hitting 401 around the same
  token-refresh race would each independently trigger their own signOut/reload. Added a
  module-level guard so only the first 401 acts.

## 6. Student safety and account lifecycle

- [ ] Block, report, password recovery, account deletion wired into active app
- [x] Block/visibility rules across profiles, matches, breakdowns, conversations, threads, send, WebSocket —
  found the same UUID-vs-`str` comparison bug class as section 3, but hiding inside block
  enforcement specifically: `get_blocked_user_ids()` returns a `set` of `uuid.UUID` objects
  (from the `Block` ORM model), but **`POST /api/messages/send`** compared it against
  `data.recipient_id` (a Pydantic `str` field) and the **WebSocket** message handler compared
  it against `recipient_id` from raw JSON (also a `str`) — both comparisons were always
  `False`, so a user could message someone who had blocked them (or vice versa) through
  either transport, completely bypassing the block. Fixed both by comparing against
  `{str(b) for b in blocked_ids}`. The other 6 call sites (matches, swipe history, share
  profile, conversations list) were already correct — they compare ORM `UUID` attributes
  against the same `UUID` set, not against a route/body `str`. Also added a block check to
  `GET /api/profile/{user_id}` (main.py), which had none at all — a blocked user who already
  knew your ID could still fetch your bio/photo directly; now returns 404 like other blocked
  surfaces. Verified locally via code read + syntax check; not yet verified with a live
  request.
- [x] Minimize personal data returned; stop exposing email — `GET /api/profile/{user_id}`
  had no ownership check at all (unlike `update_profile`, which does) and returned any
  authenticated user's real email to any other authenticated user who requested their
  profile. Made `UserProfile.email` `Optional[str] = None` in `schemas.py` and `get_profile`
  in `main.py` now only populates it when `current_user.id == user_id`, i.e. viewing your own
  profile. Checked `MatchResponse`/`SwipeHistoryItem`/`ConversationPreview` schemas and the
  public share-token profile endpoint — none of them expose email. Verified locally via code
  read + syntax check; not yet verified with a live request.
- [x] Contact policy determined and enforced on every transport — owner decided: keep open
  messaging (block-list only), no mutual-match requirement. No code change needed; current
  behavior (any authenticated, non-blocked user may message another) already matches the
  decision. Not re-verified end-to-end (no reachable deployment, B1).
- [ ] Moderation workflow with protected access and suspension
- [ ] Deletion removes Supabase identity + app data + photos
- [ ] Partial-deletion retry/reconciliation; no silent resurrection
- [ ] Suspended/deleted accounts lose access

## 7. Questionnaire and matching

- [ ] One versioned question contract (ids, option values, labels)
- [x] Fix genderPreference mismatch — frontend's `genderPreference` question has always had 4
  options (`["Male","Female","Non-binary","No preference"]`), but `matching.py` treated index
  `2` as "no preference" (colliding with "Non-binary") and its own `QUESTIONS`/`question_map`
  only listed 3 options for that question. Changed the sentinel to index `3` (a new
  `GENDER_PREFERENCE_NO_PREFERENCE` constant), added "Non-binary" to `question_map`, and
  updated the 8 dev fake-user seed rows in `main.py` that had used the stale `2`-means-no-
  preference convention to `3`. Also fixed the AI-explanation endpoint's `get_question_text(key)`
  call (was missing the required `option_index` arg, would crash — added a `QUESTION_LABELS`
  map and call `get_question_text(key, value)` instead). Verified locally via `ast.parse`; not
  yet verified by running the matching algorithm against real questionnaire data (pending test
  suite repair, delegated to a subagent — see below).
- [ ] Review every question for similar drift — **new finding**: the active frontend
  questionnaire (`App.jsx` `QUESTIONS`) never asks `hasApartment`, `pets`,
  `apartmentLocation`, `apartmentRent`, `apartmentRooms`, `spotsAvailable`, or
  `apartmentAvailable`, even though `matching.py` and `main.py`'s match-breakdown/AI-prompt
  code branch heavily on them (the "one has an apartment, one is looking" flow). Either that
  frontend flow was never built or was removed. This is a product-scope question, not a typo
  fix — flagging for owner rather than guessing whether to build the missing UI or delete the
  dead backend branches.
- [ ] Migrate stored answers only where meaning is known
- [ ] Server-side validation: required, conditional, permitted options, custom-text length
- [ ] Reject empty/invalid completed questionnaires
- [ ] Questions align with supported behaviour
- [ ] Hard constraints separated from weighted preferences
- [ ] Stale matches recalculated/removed on retake
- [ ] Deterministic bounded candidate selection (replace arbitrary 500 cap)
- [ ] Tests use real frontend values

## 8. Data access and production configuration

- [ ] Supabase schema exposure/grants/RLS inspected with authorized access
- [ ] App tables protected by RLS/grants or non-exposed schema
- [ ] Least-privileged runtime role; separate migration role
- [ ] Encrypted DB connections; bounded pool
- [x] Dev endpoints disabled in production — checked: the only `/api/dev/*` route
  (`create-fake-users`) already gates on `os.getenv("ENV", "development") == "production"`.
  No change needed.
- [x] `.dockerignore` excluding secrets, local DBs, venvs — neither `backend/` nor `frontend/`
  had one, so `docker-compose.yml`'s `COPY . .` (build context = `./backend`, `./frontend`)
  would bake in `.env`, `matchmyroom.db`, `.venv/`, `node_modules/`, `dist/` etc. Added
  `backend/.dockerignore` and `frontend/.dockerignore`. Verified locally: files exist with the
  right entries; not verified with an actual `docker build` (no Docker run in this session).
- [ ] Environment variable names reconciled and documented

## 9. Operational reliability

- [x] Liveness separated from readiness — `/api/ping` (no DB touch) is liveness; `/api/health`
  is now readiness only.
- [x] HTTP 503 + safe body when DB unavailable — `/api/health` now runs `SELECT 1` and raises
  `HTTPException(503, {"status": "error", "database": "unavailable"})` on failure instead of
  returning 200 with `str(e)`; the real exception is only printed server-side. Verified locally
  via code read + syntax check; not yet verified against an actually-down DB (no reachable
  Postgres, B1).
- [ ] Deployment healthcheck + external monitoring
- [ ] Structured logs + request correlation, without secrets/PII
- [ ] Backup/restore verified
- [ ] Supabase Auth SMTP configured separately from notification email
- [ ] Templates, OTP, recovery URLs, production domain aligned
- [ ] Sender domain (SPF/DKIM/DMARC) and delivery to both universities
- [ ] Durable notification delivery (replace daemon threads) — confirmed real: `main.py`
  ~lines 776 and 793 fire `threading.Thread(daemon=True)` for like/match emails. If the
  process is killed or redeployed between the thread starting and the email actually
  sending, the notification is silently lost with no retry. Not fixing now: a real fix needs
  a persisted outbox (DB table + a worker/cron to drain it) or a queue service, which is an
  infra/architecture decision, not a one-line change — flagging rather than picking an
  approach unilaterally. Swapping to FastAPI's `BackgroundTasks` would look tidier but is
  **not** actually more durable (still in-process, still lost on crash), so I didn't do that
  either as a fake fix.
- [ ] No workers/replicas while sockets and limits are in-process — this is a deployment
  topology constraint (in-memory `ConnectionManager` for WebSockets and `slowapi`'s
  in-process rate-limit counters both break with >1 replica/worker), not something to fix in
  code. Documenting: whoever configures Railway must run exactly 1 replica / 1 uvicorn worker
  until these are moved to shared state (e.g. Redis).
- [x] Bounded messaging queries and pagination — `get_conversations` loaded *every* message
  a user had ever sent or received, unbounded, to build the conversation-preview list in
  Python. Replaced with two SQL aggregations: a `ROW_NUMBER() OVER (PARTITION BY partner
  ORDER BY sent_at DESC)` window function picks each partner's latest message, and a
  `GROUP BY` counts unread messages per sender — cost is now bounded by conversation-partner
  count, not total message count. `get_message_thread` was already properly paginated
  (`skip`/`limit`, capped at 200). Verified locally with a new multi-partner test (ordering +
  per-partner unread counts); window functions are standard SQL with no dialect-specific
  syntax, but not yet verified against a real Postgres instance (B1).
- [A] Rate limiting correct for topology + trusted proxies — `slowapi`'s
  `get_remote_address` key func only reads `request.client.host` (verified by reading its
  source), which is the direct TCP peer. Behind Railway's edge proxy that's Railway's proxy,
  not the real client, unless Starlette's `ProxyHeadersMiddleware` is active to rewrite it
  from `X-Forwarded-For`. Added `--proxy-headers --forwarded-allow-ips='*'` to
  `backend/Procfile`'s uvicorn start command (the standard PaaS pattern: the container isn't
  reachable except through Railway's edge, so trusting XFF from "anyone who reaches the
  container" is safe there). **Cannot verify this is actually correct without a live
  deployment** — Railway is down (B1). Marked `[A]`, not `[x]`.
- [ ] No workers/replicas while sockets and limits are in-process
- [~] Realtime: wss, authorization, limits, expiry, disconnect cleanup — authorization
  was already solid (JWKS-verified token, UUID-compared to the path `user_id`, closes with
  4001/4003 on mismatch; PyJWT verifies `exp` by default so expiry is covered). Fixed a real
  cleanup bug: `ws_manager.disconnect(user_id)` and the offline `last_seen` update only ran
  on `WebSocketDisconnect` — any other exception in the receive loop (malformed JSON, a bug,
  a DB error) skipped cleanup entirely, permanently leaking that entry in the in-process
  `active_connections` dict and leaving `is_online` wrong for that user forever. Moved
  cleanup into a `finally` so it always runs. Not marked `[x]`: `wss` (TLS) and "limits" are
  deployment-topology properties (Railway terminates TLS; there's no per-connection message
  rate limit) I can't verify or safely add without a reachable deployment and a decision on
  message-rate limits — leaving as partially done.
- [x] Cloudinary moderation + replacement failure behaviour — found a real destructive bug:
  `upload_profile_picture` (`cloudinary_config.py`) uploaded straight to the user's stable
  `public_id` with `overwrite=True`, so the old accepted picture was replaced by the *new*
  upload before AWS Rekognition moderation even ran; if the new image was then rejected, the
  code destroyed that same public_id — deleting the only remaining asset. Net effect: any
  rejected upload permanently destroyed the user's existing good picture too, and `main.py`
  additionally had its own explicit `delete_profile_picture(user.id)` call *before* even
  attempting the new upload, so a hard upload failure (exception, no rejection) also wiped
  the old picture with nothing to replace it. Fixed by uploading to a temporary public_id
  first, only `cloudinary.uploader.rename(..., overwrite=True)`-promoting it to the stable
  public_id after moderation passes; on rejection or failure only the temp asset is
  destroyed, old picture is untouched. Removed the now-redundant (and now actively wrong)
  explicit delete call from `main.py`'s `upload_picture` — the rename already replaces
  atomically. `delete_profile_picture` itself is still used correctly by account deletion.
  Verified locally: `ast.parse` succeeds; **not verified against real Cloudinary** (would
  need live credentials + a request).
- [x] AI explanation endpoint repaired or explicitly disabled — fixed the `get_question_text`
  crash (see section 7) and also found it was calling a non-existent model id
  `"claude-opus-4-6"`, which would fail every request and get swallowed into a generic 503
  "AI service temporarily unavailable" (silently broken, not just crashing). Changed to
  `"claude-sonnet-5"`, a real current model. Already has a real `if not api_key: 503` guard
  for missing `ANTHROPIC_API_KEY`, so "explicitly disabled when unconfigured" was already
  correct. Not yet verified with a live Anthropic API call (would need a real key + running
  server).

## 10. Dependencies, privacy, documentation

- [x] Frontend + backend dependency audit against current advisories — found `passlib` and
  `bcrypt` in `backend/requirements.txt` were dead weight from the old local-password auth
  (grepped: unused anywhere in `backend/app/`); their only remaining consumer was
  `backend/add_fake_users.py`, a standalone dev script that itself still constructed
  `User(password_hash=...)`, a column the model no longer has — it would crash if run, and
  is fully superseded by the working `/api/dev/create-fake-users` endpoint in `main.py`.
  Deleted the dead script and removed the two unused dependencies (kept `cryptography`,
  which `PyJWT` needs for ES256). Did not run a full CVE/advisory scan (`pip-audit`/`npm
  audit`) — no network/tooling check performed this session; flagging as still open.
- [ ] Runtime exposure triaged separately from dev tooling
- [ ] Compatible upgrades applied (no blind majors)
- [ ] Lint and config inconsistencies resolved
- [ ] Necessity review of religion and dietary/allergy collection
- [ ] Privacy controls and truthful disclosures
- [ ] Legal/business decisions flagged, not invented
- [ ] Setup/env/deploy/recovery/ops docs match reality

---

## External blockers

| # | Blocker | Needed from owner |
| --- | --- | --- |
| B1 | Railway trial expired; project suspended, both service and Postgres offline | **Decided 2026-09-21**: owner will pay for Railway Hobby (~$5/mo). Owner still needs to actually restore billing — no backend can be reached until then. |
| B2 | No Railway/Vercel/Supabase dashboard access from this environment | Owner must apply env vars, domains, SMTP, RLS, auth hooks |
| B3 | Live Supabase schema/grants/RLS cannot be inspected | Authorized DB access |
| B4 | ~~Eligibility policy (alumni/staff vs enrolled students)~~ | **Resolved 2026-09-21**: current students only. Alumni domain removed from backend + frontend + Supabase trigger (needs re-deploy of the SQL, B2). |
| B5 | ~~Contact policy (mutual match required to message?)~~ | **Resolved 2026-09-21**: keep open messaging (block-list only), no code change needed. |
| B6 | Privacy/legal review for Quebec obligations | Qualified advice |
