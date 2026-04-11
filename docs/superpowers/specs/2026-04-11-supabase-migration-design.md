# Supabase Authentication and Database Migration Design

## Purpose
Migrate the MatchMyRoom application from a custom Railway-hosted PostgreSQL + Custom JWT authentication system to Supabase Auth and Database for improved auth management, cleaner code, and a simplified developer experience, while initializing an empty database instance instead of mirroring existing records.

## Architecture Options Handled
- **Approach Chosen:** **Option 1 (Supabase Auth Frontend + SQLAlchemy Backend)**
  - Frontend directly uses the `supabase-js` library for auth flows (signup, verification, session login).
  - FastAPI is reduced to its core logical roles (complex matching, data orchestration) and relies on Supabase’s built-in JWT context mapped natively from the header.

## Detailed Component Changes
### 1. Database Schema modifications
- **UUID Transition:** Update `models.py` definitions. Transform the `users.id` column from `Integer` auto-increment to `UUID` (String/UUID format) to match Supabase's `auth.users.id`.
- **References:** Alter foreign keys across the application corresponding to `users.id`:
  - `Match.user1_id` & `Match.user2_id`
  - `Like.liker_id` & `Like.liked_id`
  - `QuestionnaireResponse.user_id`
  - `Message.sender_id` & `Message.recipient_id`
  - `Block.blocker_id` & `Block.blocked_id`
  - `Report.reporter_id` & `Report.reported_id`
- **Database Trigger:** Create SQL inside Supabase to hook into `/auth.users` additions. This fires `AFTER INSERT` on `auth.users`, seamlessly popping a default model directly into the `public.users` table so FastAPI retains references for algorithms.

### 2. Backend Iterations (FastAPI)
- **Removal of Legacy Logic:** Delete endpoint routes within `main.py` explicitly related to custom identity implementations (e.g., `/api/signup`, `/api/login`, `/api/verify-email`).
- **Remove Auth Utils:** Scrap the internal `CryptContext` hashing mechanism and token builders.
- **Middleware Update:** Shift `get_current_user` local validation method to explicitly evaluate and reconstruct the `jwt.decode` logic using the `SUPABASE_JWT_SECRET`. Since the payload yields the `sub` component, this reliably casts the context variables to standard UUID identification schemas matching the local database.

### 3. Frontend Shifts (React)
- **Dependency Integration:** Install `@supabase/supabase-js`. Add initialization config using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **AuthPage Overhaul:** Convert the complex submission hooks inside `AuthPage.jsx` logic structure to directly call either `supabase.auth.signInWithPassword()` or `supabase.auth.signUp()`.
- **Verification Refactor:** Use Supabase's standard out-of-the-box email resolution loops.
- **Network Decorators:** Update `authFetch` behavior to reliably extract sessions (`supabase.auth.getSession()`), guaranteeing that the `access_token` correctly overrides Bearer context boundaries.

## Trade-Offs Analyzed
- **Loss of Legacy Railway Information:** Since we rely heavily on integers initially, data migration is incredibly complex due to mismatched ID typing. Deciding to explicitly abandon legacy tables cleanly avoids this headache entirely for Beta deployment states.

## Testing Verification
- **Test User Sign-Up**: Confirm that signing up on frontend creates an element both in Supabase UI and that the DB trigger inserts a record simultaneously in the public REST API.
- **Test Match Route Integrity**: Assert that matches are fully resolvable using UUID relationships in Postgres tables without structural failures.
- **Header Parsing Integrity**: Securely lock down user UUID isolation tests through the `get_current_user` method injection framework.
