# My Swipes Page — Design Spec

**Date:** 2026-03-26
**Status:** Approved

---

## Overview

A new authenticated page at `/swipes` that shows all users the logged-in user has swiped right on (liked), split into two sections: mutual matches (liked back) and pending likes (not yet reciprocated). Mutual matches surface a direct "Message" shortcut.

---

## Backend

### New endpoint

```
GET /api/swipes/history/{user_id}
```

- Requires JWT (`Authorization: Bearer <token>`).
- Returns 403 if `current_user.id != user_id`.
- Queries `Like` table for all rows where `user_id == user_id AND is_like == True`, ordered by `created_at DESC`.
- For each liked user, checks whether they have a reciprocal `Like` row back — sets `is_mutual` flag.
- Response shape per item:

```json
{
  "user_id": 42,
  "name": "Jane Doe",
  "university": "mcgill",
  "profile_pic_url": "https://...",
  "program": "Software Engineering",
  "is_mutual": true,
  "swiped_at": "2026-03-24T14:22:00"
}
```

- Returns `[]` if no likes exist.

---

## Frontend

### Files changed

| File | Change |
|------|--------|
| `src/utils/api.js` | Add `getSwipeHistory(userId, token)` helper |
| `src/pages/MySwipesPage.jsx` | New page component |
| `src/App.jsx` | Add `/swipes` protected route |
| `src/components/NavBar.jsx` | Add "My Swipes" nav button |

### Route

`/swipes` — protected, requires login and questionnaire completion. Use this exact pattern from `App.jsx`:

```jsx
<ProtectedRoute isLoggedIn={isLoggedIn} questionnaireCompleted={questionnaireCompleted} requireQuestionnaire>
  <MySwipesPage user={user} token={token} />
</ProtectedRoute>
```

### API helper

```js
export const getSwipeHistory = (userId, token) =>
  authFetch(`${API_BASE}/swipes/history/${userId}`, {}, token);
```

### Page layout — `MySwipesPage.jsx`

On mount: fetch `getSwipeHistory(user.user_id, token)`, split response into `mutuals` (where `is_mutual === true`) and `pending` (where `is_mutual === false`).

**Section 1 — Mutual Matches** (hidden if empty)
- Section header: green heart icon + "Mutual Matches" label + count badge.
- One horizontal card per user:
  - Left: circular avatar (profile pic or initials fallback using existing `getInitials` pattern).
  - Center: name (bold), university label, program.
  - Right: green "Message" button + "View Profile" link button.
  - "Message" navigates to `/messages` with `{ state: { selectedMatch: { user_id, name, profile_pic_url, university } } }`. MessagesPage reads `location.state?.selectedMatch` and uses `user_id`, `name`, `profile_pic_url`, and `university` for rendering the conversation header.

**Section 2 — Pending Likes**
- Section header: clock icon + "Pending Likes" label + count badge.
- Same card layout, minus the Message button.
- Shows `swiped_at` as relative time (e.g. "2 days ago").

**Empty state (no swipes at all)**
- Centered message: "You haven't liked anyone yet." with a sub-line "Head to the Dashboard to start swiping." and a button linking to `/dashboard`.

**Profile modal**
- "View Profile" opens existing `ProfileModal` component.
- Fetch full profile via existing `getProfile(userId, token)` before opening modal.
- Pass `profileData`, `onClose`, `currentUser` (the logged-in `user` prop), `onMessage`, and `onBlock` to `ProfileModal`:
  - `currentUser` — required for block/report actions inside the modal.
  - `onMessage` — navigate to `/messages` with the correct state payload; ensures the modal's "Send Message" button functions (relevant for mutual match profiles).
  - `onBlock` — remove the blocked user from both `mutuals` and `pending` state arrays so the card disappears immediately without a re-fetch.

### Styling

- Follows existing conventions: inline styles using `C` and `font` from `../theme/colors`.
- Page wrapper: `paddingTop: 100, padding: "100px 24px 60px"`, `maxWidth: 720, margin: "0 auto"`.
- Cards: `background: C.surface`, `border: 1px solid C.border`, `borderRadius: 16`, `padding: 16`.
- Mutual badge: `background: rgba(16,185,129,0.09)`, `border: 1px solid rgba(16,185,129,0.35)`, `color: C.green`.

### NavBar

Add a "My Swipes" text button between the existing "Messages" and "Profile" buttons, matching the existing `btn-secondary` style.

---

## Data flow

```
MySwipesPage mounts
  → getSwipeHistory(user.user_id, token)
  → split into mutuals[] and pending[]
  → render two sections
  → "View Profile" click → getProfile(userId) → open ProfileModal
  → "Message" click → navigate("/messages", { state: { selectedMatch } })
```

---

## Out of scope

- Pagination (list is expected to be small).
- Ability to un-like from this page.
- Push notifications or real-time updates on this page.
