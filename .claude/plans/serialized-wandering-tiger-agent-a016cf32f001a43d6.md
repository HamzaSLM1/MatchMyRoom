# Frontend Refactor Plan: App.jsx Component Architecture

## Key Finding
After reading the entire codebase, the frontend **already uses real API calls** -- not mock data. Every endpoint (signup, login, verify-email, questionnaire/submit, matches/calculate, matches/{id}, swipes/like, messages/send, messages/thread, messages/conversations, profile/{id}, profile/update, profile/upload-picture) is called from App.jsx using `authFetch()` or `fetch()`. The refactor is purely architectural: breaking a 1875-line single file into a proper component structure.

## Status: UNBLOCKED
Backend confirmed: data key mismatch was only in fake user seed data (`housingType` vs `hasApartment`/`livingLocation`). No frontend key changes needed.

## Backend API Contract Changes to Incorporate
1. **`POST /api/matches/calculate` now requires JWT auth** -- frontend already uses `authFetch()` for this call (QuestionnairePage line 732), so no change needed.
2. **New WebSocket endpoint**: `ws /api/ws/{user_id}?token=<jwt_token>` for real-time messaging. Messages arrive as JSON with `type: "new_message"`. Will integrate this in MessagesPage to replace the current 3-second polling interval.
3. **Pet question**: Backend now scores pet compatibility, but no frontend questionnaire question exists yet. Out of scope for this refactor -- can be added later.

---

## Architecture Plan

### New Dependencies
- `react-router-dom` (for proper URL-based routing instead of `useState("page")`)

### File Structure

```
frontend/src/
  main.jsx                  (update: wrap App in BrowserRouter)
  App.jsx                   (slim: router setup, auth context provider, global styles)

  utils/
    api.js                  (API_BASE, authFetch, all endpoint functions)
    theme.js                (C, font, applyTheme, globalStyles)
    questions.js            (questions array + conditional logic helpers)

  hooks/
    useAuth.js              (login, logout, signup, token/user state, localStorage persistence)
    useWebSocket.js         (WebSocket connection for real-time messages)

  components/
    Logo.jsx                (Logo component)
    NavBar.jsx              (NavBar component)
    ProfileModal.jsx        (reusable profile modal -- used in SwipeInterface & MessagesPage)
    ProfileCompletionMeter.jsx
    SwipeCard.jsx           (drag/swipe card)
    MatchListItem.jsx       (expandable match row for list view)

  pages/
    LandingPage.jsx
    AuthPage.jsx            (handles both login & signup modes)
    VerificationPage.jsx
    QuestionnairePage.jsx
    DashboardPage.jsx       (contains SwipeInterface + list view toggle)
    ProfileEditPage.jsx
    MessagesPage.jsx
```

### Implementation Steps

#### Phase 1: Extract utilities (no behavior change)
1. Create `utils/theme.js` -- move `C`, `font`, `applyTheme`, `globalStyles`, `FONTS_LINK`
2. Create `utils/api.js` -- move `API_BASE`, `authFetch`
3. Create `utils/questions.js` -- move `questions` array

#### Phase 2: Extract hooks
4. Create `hooks/useAuth.js` -- extract auth state management (token, user, login, logout, session restore from localStorage, unread count polling)
5. Create `hooks/useWebSocket.js` -- WebSocket connection to `ws /api/ws/{user_id}?token=<jwt>`, listens for `type: "new_message"` events, exposes incoming messages and connection state

#### Phase 3: Extract components (bottom-up, smallest first)
6. Create `components/Logo.jsx`
7. Create `components/NavBar.jsx`
8. Create `components/ProfileCompletionMeter.jsx`
9. Create `components/SwipeCard.jsx`
10. Create `components/ProfileModal.jsx` -- consolidate the duplicate profile modal from SwipeInterface and MessagesPage into one reusable component
11. Create `components/MatchListItem.jsx` -- the expandable match card from DashboardPage list view

#### Phase 4: Extract pages
12. Create `pages/LandingPage.jsx`
13. Create `pages/AuthPage.jsx`
14. Create `pages/VerificationPage.jsx`
15. Create `pages/QuestionnairePage.jsx`
16. Create `pages/DashboardPage.jsx` (includes SwipeInterface inline or as a local component)
17. Create `pages/ProfileEditPage.jsx`
18. Create `pages/MessagesPage.jsx` -- integrate `useWebSocket` hook to replace 3-second polling with real-time message delivery

#### Phase 5: React Router
19. Install `react-router-dom`
20. Update `main.jsx` to wrap App in `BrowserRouter`
21. Replace `useState("page")` routing with React Router `<Routes>` and `useNavigate()`
22. Route map:
    - `/` -> LandingPage
    - `/login` -> AuthPage (mode="login")
    - `/signup` -> AuthPage (mode="signup")
    - `/verify` -> VerificationPage
    - `/questionnaire` -> QuestionnairePage (protected)
    - `/dashboard` -> DashboardPage (protected)
    - `/profile` -> ProfileEditPage (protected)
    - `/messages` -> MessagesPage (protected)
    - `/messages/:userId` -> MessagesPage with pre-selected conversation (protected)
23. Add `ProtectedRoute` wrapper that redirects to `/login` if not authenticated

#### Phase 6: Slim down App.jsx
24. App.jsx becomes: auth context provider + router setup + global style injection

### What I will NOT change
- Visual design / CSS / inline styles (preserve existing aesthetic)
- Backend files
- Core business logic
- The `authFetch` behavior pattern (just moving it to utils/api.js)

### Risks & Mitigations
- **Risk**: React Router changes URLs, could break Vite proxy. **Mitigation**: All API calls go through `/api` prefix which is already proxied; client-side routes use different paths.
- **Risk**: Component extraction could introduce bugs from missed prop threading. **Mitigation**: Incremental extraction, each component tested after extraction.
- **Risk**: WebSocket connection management (reconnection, cleanup). **Mitigation**: useWebSocket hook handles reconnect logic and cleanup on unmount; falls back to polling if WS fails.
