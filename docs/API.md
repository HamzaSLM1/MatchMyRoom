# API

The API reference is generated from the code by FastAPI, so it can't drift from the routes:

- Interactive docs: `http://localhost:8000/docs` (Swagger UI) or `/redoc`
- Raw schema: `http://localhost:8000/openapi.json`

All endpoints except `/api/ping`, `/api/health` and `/api/profile/public/{share_token}` require a
Supabase access token: `Authorization: Bearer <token>`. User ids are UUIDs; a malformed id returns
422. Endpoints that act on a user (`user_id` in the path or query) return 403 unless it matches the
token's user.
