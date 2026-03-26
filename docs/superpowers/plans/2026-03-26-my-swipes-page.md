# My Swipes Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/swipes` page that shows all users the logged-in user has liked, split into Mutual Matches (with a Message button) and Pending Likes sections.

**Architecture:** One new backend GET endpoint inserted after line 991 of `main.py` returns liked users with mutual flags. A new `MySwipesPage.jsx` consumes it via a new `getSwipeHistory` API helper, renders two card sections, and reuses the existing `ProfileModal` component. Routing and NavBar are updated to wire everything together.

**Tech Stack:** FastAPI (Python), SQLAlchemy, React 18, React Router v6, inline styles via theme `C`/`font` constants, Lucide React icons.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/app/main.py` | Modify (insert after line 991) | New `GET /api/swipes/history/{user_id}` endpoint |
| `frontend/src/utils/api.js` | Modify | Add `getSwipeHistory` helper |
| `frontend/src/pages/MySwipesPage.jsx` | Create | Full My Swipes page component |
| `frontend/src/App.jsx` | Modify | Add `/swipes` protected route |
| `frontend/src/components/NavBar.jsx` | Modify | Add "My Swipes" nav button |

---

## Chunk 1: Backend endpoint + API helper

### Task 1: Add `GET /api/swipes/history/{user_id}` to `main.py`

**Files:**
- Modify: `backend/app/main.py` (insert after line 991, before `# ─── Messaging Endpoints`)

- [ ] **Step 1: Insert the endpoint**

In `backend/app/main.py`, after line 991 (`return {"has_liked": like is not None}`), add a blank line then insert:

```python
@app.get("/api/swipes/history/{user_id}")
def get_swipe_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users this person has liked (swiped right on)"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot view another user's swipes")

    likes = db.query(Like).filter(
        Like.user_id == user_id,
        Like.is_like == True
    ).order_by(Like.created_at.desc()).all()

    liked_user_ids = [l.liked_user_id for l in likes]
    if not liked_user_ids:
        return []

    users = db.query(User).filter(User.id.in_(liked_user_ids)).all()
    users_map = {u.id: u for u in users}

    mutual_likes = db.query(Like).filter(
        Like.user_id.in_(liked_user_ids),
        Like.liked_user_id == user_id,
        Like.is_like == True
    ).all()
    mutual_ids = {l.user_id for l in mutual_likes}

    result = []
    for like in likes:
        u = users_map.get(like.liked_user_id)
        if not u:
            continue
        result.append({
            "user_id": u.id,
            "name": u.name,
            "university": u.university,
            "profile_pic_url": u.profile_pic_url,
            "program": u.program,
            "is_mutual": like.liked_user_id in mutual_ids,
            "swiped_at": like.created_at.isoformat() if like.created_at else None
        })
    return result
```

- [ ] **Step 2: Verify the backend starts without errors**

```bash
cd /Users/hamzasalama/MatchMyRoom
source .venv/bin/activate && python -m uvicorn app.main:app --port 8000 --app-dir backend 2>&1 | head -20
```

Expected: `Application startup complete.` with no import or syntax errors. Stop the server (`Ctrl+C`) after confirming.

- [ ] **Step 3: Commit**

```bash
cd /Users/hamzasalama/MatchMyRoom
git add backend/app/main.py
git commit -m "feat: add GET /api/swipes/history/{user_id} endpoint"
```

---

### Task 2: Add `getSwipeHistory` to `api.js`

**Files:**
- Modify: `frontend/src/utils/api.js` (insert after the `recordSwipe` export, around line 89)

- [ ] **Step 1: Add the helper**

In `frontend/src/utils/api.js`, after the `recordSwipe` export block, insert:

```js
export const getSwipeHistory = (userId, token) =>
  authFetch(`${API_BASE}/swipes/history/${userId}`, {}, token);
```

- [ ] **Step 2: Verify no syntax errors**

```bash
cd /Users/hamzasalama/MatchMyRoom/frontend
node --input-type=module < src/utils/api.js 2>&1 | head -5
```

Expected: no output (clean parse). If there's an error, fix the syntax before continuing.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/api.js
git commit -m "feat: add getSwipeHistory API helper"
```

---

## Chunk 2: MySwipesPage component

### Task 3: Create `MySwipesPage.jsx`

**Files:**
- Create: `frontend/src/pages/MySwipesPage.jsx`

- [ ] **Step 1: Create the file with this content**

```jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C, font } from "../theme/colors";
import { getSwipeHistory, getProfile } from "../utils/api";
import ProfileModal from "../components/ProfileModal";
import { Heart, Clock, MessageCircle, User, GraduationCap } from "lucide-react";

function getInitials(name) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Avatar({ user }) {
  if (user.profile_pic_url) {
    return (
      <img
        src={user.profile_pic_url}
        alt={user.name}
        style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: font.display, fontSize: 18, fontWeight: 700, color: "white"
    }}>
      {getInitials(user.name)}
    </div>
  );
}

function SwipeCard({ entry, onViewProfile, onMessage, isMutual }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: 16, marginBottom: 12
    }}>
      <Avatar user={entry} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 2 }}>
          {entry.name}
        </div>
        <div style={{ fontSize: 13, color: C.textMuted, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <GraduationCap size={12} style={{ display: "inline", verticalAlign: "middle" }} />
            {entry.university === "concordia" ? "Concordia" : "McGill"}
          </span>
          {entry.program && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <User size={12} style={{ display: "inline", verticalAlign: "middle" }} />
              {entry.program}
            </span>
          )}
          {!isMutual && entry.swiped_at && (
            <span style={{ color: C.textDim, fontSize: 12 }}>{timeAgo(entry.swiped_at)}</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {isMutual && (
          <button
            className="btn-primary"
            style={{ padding: "8px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => onMessage(entry)}
          >
            <MessageCircle size={14} style={{ display: "inline", verticalAlign: "middle" }} />
            Message
          </button>
        )}
        <button
          className="btn-secondary"
          style={{ padding: "8px 14px", fontSize: 13 }}
          onClick={() => onViewProfile(entry.user_id)}
        >
          View Profile
        </button>
      </div>
    </div>
  );
}

export default function MySwipesPage({ user, token }) {
  const navigate = useNavigate();
  const [mutuals, setMutuals] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileModal, setProfileModal] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getSwipeHistory(user.user_id, token);
        if (res.ok) {
          const data = await res.json();
          setMutuals(data.filter(d => d.is_mutual));
          setPending(data.filter(d => !d.is_mutual));
        }
      } catch (err) {
        console.error("Error fetching swipe history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user.user_id, token]);

  const handleViewProfile = async (userId) => {
    try {
      const res = await getProfile(userId, token);
      if (res.ok) {
        const data = await res.json();
        setProfileModal(data);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const handleMessage = (entry) => {
    navigate("/messages", {
      state: {
        selectedMatch: {
          user_id: entry.user_id,
          name: entry.name,
          profile_pic_url: entry.profile_pic_url,
          university: entry.university,
        }
      }
    });
  };

  const handleBlock = (blockedUserId) => {
    setMutuals(prev => prev.filter(e => e.user_id !== blockedUserId));
    setPending(prev => prev.filter(e => e.user_id !== blockedUserId));
  };

  const isEmpty = !loading && mutuals.length === 0 && pending.length === 0;

  return (
    <div style={{ minHeight: "100vh", padding: "100px 24px 60px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 6 }}>
            My Swipes
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted }}>
            Everyone you've liked — mutual matches can be messaged directly.
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: C.textMuted, padding: 60 }}>Loading...</div>
        )}

        {isEmpty && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>👀</div>
            <p style={{ fontFamily: font.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>
              You haven't liked anyone yet.
            </p>
            <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24 }}>
              Head to the Dashboard to start swiping.
            </p>
            <button className="btn-primary" style={{ padding: "10px 24px" }} onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </button>
          </div>
        )}

        {!loading && mutuals.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Heart size={18} color={C.green} fill={C.green} style={{ display: "inline", verticalAlign: "middle" }} />
              <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 16, color: C.text }}>
                Mutual Matches
              </span>
              <span style={{
                background: "rgba(16,185,129,0.09)", border: "1px solid rgba(16,185,129,0.35)",
                color: C.green, borderRadius: 100, padding: "2px 10px", fontSize: 12, fontWeight: 700
              }}>
                {mutuals.length}
              </span>
            </div>
            {mutuals.map(entry => (
              <SwipeCard
                key={entry.user_id}
                entry={entry}
                isMutual={true}
                onViewProfile={handleViewProfile}
                onMessage={handleMessage}
              />
            ))}
          </section>
        )}

        {!loading && pending.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Clock size={18} color={C.textMuted} style={{ display: "inline", verticalAlign: "middle" }} />
              <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 16, color: C.text }}>
                Pending Likes
              </span>
              <span style={{
                background: C.surfaceLight, border: `1px solid ${C.border}`,
                color: C.textMuted, borderRadius: 100, padding: "2px 10px", fontSize: 12, fontWeight: 700
              }}>
                {pending.length}
              </span>
            </div>
            {pending.map(entry => (
              <SwipeCard
                key={entry.user_id}
                entry={entry}
                isMutual={false}
                onViewProfile={handleViewProfile}
                onMessage={handleMessage}
              />
            ))}
          </section>
        )}
      </div>

      {profileModal && (
        <ProfileModal
          profileData={profileModal}
          onClose={() => setProfileModal(null)}
          currentUser={user}
          onMessage={(profileData) => handleMessage({
            user_id: profileData.user_id,
            name: profileData.name,
            profile_pic_url: profileData.profile_pic_url,
            university: profileData.university,
          })}
          onBlock={(blockedUserId) => {
            handleBlock(blockedUserId);
            setProfileModal(null);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/hamzasalama/MatchMyRoom
git add frontend/src/pages/MySwipesPage.jsx
git commit -m "feat: add MySwipesPage component"
```

---

## Chunk 3: Routing and navigation

### Task 4: Add `/swipes` route to `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Import `MySwipesPage`**

At the top of `frontend/src/App.jsx`, after the `import MessagesPage` line, add:

```jsx
import MySwipesPage from "./pages/MySwipesPage";
```

- [ ] **Step 2: Add the protected route**

In `frontend/src/App.jsx`, after the `/messages` route block (around line 80), add:

```jsx
<Route path="/swipes" element={
  <ProtectedRoute isLoggedIn={isLoggedIn} questionnaireCompleted={questionnaireCompleted} requireQuestionnaire>
    <MySwipesPage user={user} token={token} />
  </ProtectedRoute>
} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: add /swipes protected route"
```

---

### Task 5: Add "My Swipes" button to `NavBar.jsx`

**Files:**
- Modify: `frontend/src/components/NavBar.jsx`

- [ ] **Step 1: Add the nav button**

In `frontend/src/components/NavBar.jsx`, in the `isLoggedIn` branch, after the Messages button and before the Profile button, insert:

```jsx
<button className="btn-secondary" style={{ padding: "9px 18px", fontSize: 14 }} onClick={() => navigate("/swipes")}>My Swipes</button>
```

- [ ] **Step 2: Verify the app runs**

```bash
cd /Users/hamzasalama/MatchMyRoom/frontend
npm run dev 2>&1 | head -20
```

Expected: `VITE ready` with no compilation errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/NavBar.jsx
git commit -m "feat: add My Swipes nav button"
```

---

## Manual smoke test checklist

After all tasks are complete, verify end-to-end in the browser:

- [ ] Log in → "My Swipes" appears in the NavBar
- [ ] Navigate to `/swipes` — page loads without error
- [ ] With no swipes: empty state message and "Go to Dashboard" button appear
- [ ] After swiping right on users: they appear in "Pending Likes"
- [ ] After a mutual like exists: that user appears in "Mutual Matches" with a green "Message" button
- [ ] "View Profile" opens `ProfileModal` with correct data
- [ ] "Message" button (on mutual card or inside modal) navigates to `/messages` with the conversation pre-selected
- [ ] Blocking a user from the profile modal removes them from the list immediately
