# MatchMyRoom

A roommate matching app for McGill and Concordia students in Montréal. Students can build a profile, answer questions about housing and daily habits, browse compatibility scores, and connect through messaging.

## Features

- **Compatibility scoring** based on budget, location, preferences, lifestyle, and pets.
- **Profiles and questionnaires** to make potential roommate matches easier to evaluate.
- **Likes and messaging** to connect with other students.
- **Profile photos** with optional Cloudinary integration.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React, Vite, CSS |
| Backend | Python, FastAPI, SQLAlchemy |
| Data | PostgreSQL, Alembic |
| Authentication | Supabase Auth |
| Media | Cloudinary |

The matching logic is a weighted scoring algorithm in [`backend/app/matching.py`](backend/app/matching.py), rather than a machine learning model.

## Run locally

You'll need Python 3.11, Node.js 18+, npm, PostgreSQL, and access to the Supabase project configured for this app.

1. Clone the repository and create your environment files:

   ```bash
   git clone https://github.com/HamzaSLM1/MatchMyRoom.git
   cd MatchMyRoom
   cp .env.example .env
   cp frontend/.env.example frontend/.env
   ```

2. Set `DATABASE_URL` in the root `.env` to a working PostgreSQL database. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env`. The backend currently verifies tokens against this project's Supabase instance, so using a different Supabase project also requires updating the JWKS URL in [`backend/app/main.py`](backend/app/main.py).

3. Start the API:

   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python -m uvicorn app.main:app --reload
   ```

4. In another terminal, start the frontend from the repository root:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Open [localhost:3000](http://localhost:3000) for the app or [localhost:8000/docs](http://localhost:8000/docs) for the API documentation. The API runs on port 8000.

## Project layout

- [`frontend/`](frontend/) — React interface
- [`backend/app/`](backend/app/) — API, database models, and matching logic
- [`backend/alembic/`](backend/alembic/) — database migrations
- [`tests/`](tests/) — backend tests

This is an evolving student project. Configuration and integrations may need adjustment for a separate deployment.
