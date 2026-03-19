# MatchMyRoom Top 5 Improvements — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical bugs, connect the redesigned frontend to the real backend, add compatibility breakdowns, mobile responsiveness, and WebSocket messaging.

**Architecture:** FastAPI backend (Python) + React/Vite frontend. Backend at `http://localhost:8000`, frontend at `http://localhost:5173`. JWT auth with Bearer tokens.

**Tech Stack:** Python 3, FastAPI, SQLAlchemy, SQLite, React, Vite, CSS

---

## Task 1: Fix Data Key Mismatch (Backend)

**The bug:** All 10 fake users in `main.py:877-957` store `housingType` in their responses, but `matching.py:93-94` reads `livingLocation`. This means `user1_housing` and `user2_housing` are always `None`, so the residence dealbreaker logic **never fires** and budget/location scoring is wrong.

**Files:**
- Modify: `backend/app/main.py:884-956` (fake user responses)
- Modify: `backend/app/matching.py:93-94` (key lookup, add `hasApartment` handling)

- [ ] **Step 1:** In `backend/app/main.py`, replace `"housingType"` with `"livingLocation"` in all 10 fake user response dicts (lines 884-956). For users with `"housingType": 0` (residence), keep as `"livingLocation": 0`. For `"housingType": 1` (off-campus), change to `"livingLocation": 1`.

- [ ] **Step 2:** In `backend/app/matching.py`, add a fallback at line 93-94 so `livingLocation` also checks for `housingType` as a backward-compatible alias:
```python
user1_housing = user1_responses.get("livingLocation", user1_responses.get("housingType"))
user2_housing = user2_responses.get("livingLocation", user2_responses.get("housingType"))
```

- [ ] **Step 3:** Verify by running the backend and calling `/api/dev/create-fake-users` then `/api/matches/calculate` — matches should now correctly show 0% for users in different residences.

---

## Task 2: Connect Clean UI to Real Backend (Frontend)

**Goal:** Take the root `App.jsx` (743 lines, clean design) and wire it to the real API. Create proper component structure.

**Files:**
- Create: `frontend/src/api.js` — API helper with auth headers
- Create: `frontend/src/pages/LandingPage.jsx`
- Create: `frontend/src/pages/AuthPage.jsx`
- Create: `frontend/src/pages/QuestionnairePage.jsx`
- Create: `frontend/src/pages/DashboardPage.jsx`
- Create: `frontend/src/pages/MessagesPage.jsx`
- Create: `frontend/src/pages/ProfilePage.jsx`
- Create: `frontend/src/components/NavBar.jsx`
- Create: `frontend/src/components/Logo.jsx`
- Create: `frontend/src/components/MatchCard.jsx`
- Create: `frontend/src/hooks/useAuth.js`
- Create: `frontend/src/styles/global.css`
- Create: `frontend/src/theme.js`
- Modify: `frontend/src/App.jsx` — replace monolith with router + component imports
- Modify: `frontend/src/main.jsx` — add BrowserRouter

> [!IMPORTANT]
> The questionnaire in root `App.jsx` has only 8 questions, but the backend expects 14+ keys (including `hasApartment`, `livingLocation`, `gender`, `genderPreference`, etc.). The questionnaire data must match the backend's `get_question_text()` map in `matching.py:172-200`.

- [ ] **Step 1:** Create `frontend/src/theme.js` — extract the `C` color object and `font` config from root `App.jsx`

- [ ] **Step 2:** Create `frontend/src/styles/global.css` — extract the `globalStyles` template string into a proper CSS file

- [ ] **Step 3:** Create `frontend/src/api.js` — API wrapper:
```javascript
const API = "http://localhost:8000/api";
export const api = {
  post: (path, body) => fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
    body: JSON.stringify(body),
  }).then(r => r.json()),
  get: (path) => fetch(`${API}${path}`, {
    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
  }).then(r => r.json()),
};
```

- [ ] **Step 4:** Create `frontend/src/hooks/useAuth.js` — auth state management hook storing token/user in localStorage

- [ ] **Step 5:** Extract components: `Logo.jsx`, `NavBar.jsx` from root `App.jsx`, referencing `theme.js`

- [ ] **Step 6:** Create `AuthPage.jsx` — real signup/login calling `POST /api/signup` and `POST /api/login`, handling email verification flow via `POST /api/verify-email`

- [ ] **Step 7:** Create `QuestionnairePage.jsx` — use the full question set matching the backend's expected keys (all 14+ questions from `frontend/src/App.jsx:190-240`), submit via `POST /api/questionnaire/submit`

- [ ] **Step 8:** Create `DashboardPage.jsx` — fetch real matches via `GET /api/matches/{userId}`, display with `MatchCard.jsx`, wire swipe buttons to `POST /api/swipes/like`

- [ ] **Step 9:** Create `MessagesPage.jsx` — conversations list via `GET /api/messages/conversations/{userId}`, thread view via `GET /api/messages/thread/{userId}/{otherId}`, send via `POST /api/messages/send`

- [ ] **Step 10:** Create `ProfilePage.jsx` — view/edit profile via `GET/PUT /api/profile/{userId}`, photo upload via `POST /api/profile/upload-picture`

- [ ] **Step 11:** Rewrite `frontend/src/App.jsx` to be a thin router (~50 lines) importing all page components

- [ ] **Step 12:** Install `react-router-dom` and update `main.jsx` with `BrowserRouter`

---

## Task 3: Add Compatibility Breakdown (Backend + Frontend)

**Goal:** Show users *why* they matched (e.g., "Budget: 30/30, Lifestyle: 20/25, Location: 0/25").

**Files:**
- Modify: `backend/app/matching.py` — return breakdown dict alongside score
- Modify: `backend/app/schemas.py` — add `compatibility_breakdown` field to `MatchResponse`
- Modify: `backend/app/main.py:575-620` — include breakdown in match response
- Create: `frontend/src/components/CompatibilityBreakdown.jsx`

- [ ] **Step 1:** Refactor `calculate_compatibility()` in `matching.py` to return a dict instead of a float:
```python
def calculate_compatibility(...) -> dict:
    # ... existing logic, but track each category
    return {
        "score": round(total, 1),
        "breakdown": {
            "budget": {"score": budget_pts, "max": 30, "label": "Budget"},
            "location": {"score": loc_pts, "max": 25, "label": "Location"},
            "gender": {"score": gen_pts, "max": 20, "label": "Gender Preference"},
            "lifestyle": {"score": life_pts, "max": 25, "label": "Lifestyle"},
        }
    }
```

- [ ] **Step 2:** Update all callers of `calculate_compatibility` in `main.py:504` to use `result["score"]` instead of the raw float

- [ ] **Step 3:** Add `compatibility_breakdown` field to `MatchResponse` in `schemas.py`:
```python
compatibility_breakdown: Optional[Dict[str, Any]] = None
```

- [ ] **Step 4:** In `get_matches()` (main.py:575-620), calculate and include the breakdown for each match

- [ ] **Step 5:** Create `CompatibilityBreakdown.jsx` — visual bars showing each category's score with labels

---

## Task 4: Mobile Responsiveness (Frontend)

**Files:**
- Create: `frontend/src/styles/responsive.css`
- Modify: each page component to use responsive classes

- [ ] **Step 1:** Create `frontend/src/styles/responsive.css` with media queries:
  - `max-width: 768px` — tablet: stack grids, reduce padding, smaller fonts
  - `max-width: 480px` — mobile: single column, hamburger nav, full-width cards, touch-friendly tap targets (min 44px)

- [ ] **Step 2:** Update `NavBar.jsx` — hamburger menu on mobile with slide-out drawer

- [ ] **Step 3:** Update `DashboardPage.jsx` — single-column match cards on mobile

- [ ] **Step 4:** Update `QuestionnairePage.jsx` — full-width options with larger tap targets

- [ ] **Step 5:** Update `MessagesPage.jsx` — full-screen conversation view on mobile

---

## Task 5: WebSocket Real-Time Messaging (Backend + Frontend)

**Files:**
- Modify: `backend/app/main.py` — add WebSocket endpoint
- Create: `frontend/src/hooks/useWebSocket.js`
- Modify: `frontend/src/pages/MessagesPage.jsx` — use WebSocket for live messages

- [ ] **Step 1:** Add WebSocket endpoint in `main.py`:
```python
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active: dict[int, WebSocket] = {}
    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws
    def disconnect(self, user_id: int):
        self.active.pop(user_id, None)
    async def send_to(self, user_id: int, data: dict):
        if user_id in self.active:
            await self.active[user_id].send_json(data)

manager = ConnectionManager()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Save message to DB, then forward
            await manager.send_to(data["recipient_id"], {
                "type": "new_message",
                "sender_id": user_id,
                "content": data["content"],
            })
    except WebSocketDisconnect:
        manager.disconnect(user_id)
```

- [ ] **Step 2:** Add JWT validation to WebSocket (verify token from query param)

- [ ] **Step 3:** Create `frontend/src/hooks/useWebSocket.js` — connect to `ws://localhost:8000/ws/{userId}?token=...`, auto-reconnect on disconnect

- [ ] **Step 4:** Update `MessagesPage.jsx` — use WebSocket for sending/receiving messages in real-time, fall back to polling if WebSocket fails

---

## Dependency Order

```
Task 1 (key mismatch) → Task 3 (breakdown uses matching.py)
Task 2 (frontend components) → Task 4 (responsive CSS needs components)
Task 2 (MessagesPage) → Task 5 (WebSocket enhances messaging)
```

**Recommended execution order:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5

---

## Verification Plan

### Automated Tests
- `pytest tests/test_matching.py` — test `calculate_compatibility` with `livingLocation` key (not `housingType`), verify breakdown dict structure
- `pytest tests/test_api.py` — test auth flow, questionnaire, match endpoints

### Manual Verification
1. **Start backend:** `cd backend && source ../.venv/bin/activate && uvicorn app.main:app --reload`
2. **Start frontend:** `cd frontend && npm run dev`
3. **Test Task 1:** Call `/api/dev/create-fake-users`, then `/api/matches/calculate` for a user — verify residence users in different residences get 0% match
4. **Test Task 2:** Sign up → verify email → questionnaire → see real matches on dashboard → send a message
5. **Test Task 3:** Expand a match card — see the compatibility breakdown bars (Budget, Location, Gender, Lifestyle)
6. **Test Task 4:** Open browser dev tools → toggle device toolbar → verify layout adapts at 768px and 480px breakpoints
7. **Test Task 5:** Open two browser tabs logged in as different matched users → send a message from one → verify it appears instantly in the other
