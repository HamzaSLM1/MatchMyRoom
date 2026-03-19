# Frontend Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add password reset UI, account deletion UI, and block/report UI to the React frontend, wired to the API contracts defined in the spec.

**Architecture:** New page components in `frontend/src/pages/`. New routes in `App.jsx`. Modifications to `AuthPage.jsx` (forgot password link), `ProfileEditPage.jsx` (danger zone), and `ProfileModal.jsx` (block/report buttons). All use existing inline styles, `C`/`font` theme, and `authFetch`.

**Tech Stack:** React 18, React Router v6, existing `authFetch` + `C` theme. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-03-19-production-readiness-design.md` — Agent 3 section

**API Contracts (from Agent 2):**
- `POST /api/auth/forgot-password` — `{email}` → always 200 (no auth)
- `POST /api/auth/reset-password` — `{token, new_password}` → 200 or 400
- `DELETE /api/users/{user_id}` — JWT required → 200 or 403
- `POST /api/users/{user_id}/block` — JWT, `{blocked_user_id}` → 200 or 400
- `POST /api/users/{user_id}/report` — JWT, `{reported_user_id, reason}` → 200

**Development note:** Agent 2's API endpoints will not exist until both agents complete. Build the UI components and wire up the fetch calls per the contracts above. End-to-end integration testing happens after the orchestrator merges all three agents' work.

---

## File Structure

| Action | File | Purpose |
|--------|------|---------|
| Modify | `frontend/src/App.jsx` | Add routes for `/forgot-password` and `/reset-password` |
| Modify | `frontend/src/pages/AuthPage.jsx` | Add "Forgot password?" link on login mode |
| Create | `frontend/src/pages/ForgotPasswordPage.jsx` | Email input form → calls forgot-password API |
| Create | `frontend/src/pages/ResetPasswordPage.jsx` | Token from URL → new password form → calls reset-password API |
| Modify | `frontend/src/pages/ProfileEditPage.jsx` | Add "Danger Zone" section + account deletion modal |
| Modify | `frontend/src/components/ProfileModal.jsx` | Add Block + Report buttons and report modal |
| Modify | `frontend/src/utils/api.js` | Add new API helper functions |

---

## Chunk 1: Password Reset Flow

### Task 1: Create ForgotPasswordPage

**Files:**
- Create: `frontend/src/pages/ForgotPasswordPage.jsx`

- [ ] **Step 1: Create ForgotPasswordPage.jsx**

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, font } from "../theme/colors";
import Logo from "../components/Logo";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email.includes("@")) return setError("Enter a valid email");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("Server error");
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 24px 60px" }}>
      <div className="anim-fade-up" style={{ width: "100%", maxWidth: 440, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Logo size={24} />
          <h2 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, marginTop: 24, letterSpacing: "-0.02em" }}>
            Reset your password
          </h2>
          <p style={{ color: C.textMuted, fontSize: 14, marginTop: 8 }}>
            Enter your university email and we'll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div>
            <div style={{ padding: "16px", borderRadius: 12, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: C.green, fontSize: 15, textAlign: "center", marginBottom: 24 }}>
              If that email is registered, you'll receive a reset link.
            </div>
            <button
              className="btn-secondary"
              style={{ width: "100%" }}
              onClick={() => navigate("/login")}
            >
              Back to login
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, display: "block" }}>University email</label>
              <input
                className="input-field"
                type="email"
                placeholder="firstname.lastname@mail.mcgill.ca"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>

            {error && (
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(237,27,47,0.1)", border: "1px solid rgba(237,27,47,0.2)", color: C.mcgillRed, fontSize: 14 }}>
                {error}
              </div>
            )}

            <button
              className="btn-primary"
              style={{ width: "100%", padding: 15, opacity: loading ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div style={{ textAlign: "center", fontSize: 14, color: C.textMuted }}>
              Remember your password?{" "}
              <span
                style={{ color: C.accent, cursor: "pointer", fontWeight: 500 }}
                onClick={() => navigate("/login")}
              >
                Log in
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify file is created correctly**

```bash
ls /Users/hamzasalama/MatchMyRoom/frontend/src/pages/ForgotPasswordPage.jsx
```
Expected: File exists.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ForgotPasswordPage.jsx
git commit -m "feat: add ForgotPasswordPage component"
```

---

### Task 2: Create ResetPasswordPage

**Files:**
- Create: `frontend/src/pages/ResetPasswordPage.jsx`

- [ ] **Step 1: Create ResetPasswordPage.jsx**

```jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C, font } from "../theme/colors";
import Logo from "../components/Logo";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      setError("Invalid reset link. Please request a new one.");
    } else {
      setToken(t);
    }
  }, []);

  const handleSubmit = async () => {
    setError("");
    setValidationError("");

    if (newPassword.length < 8) {
      return setValidationError("Password must be at least 8 characters.");
    }
    if (newPassword !== confirmPassword) {
      return setValidationError("Passwords do not match.");
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await response.json();

      if (response.status === 400) {
        setError("This reset link is invalid or has expired. Please request a new one.");
      } else if (!response.ok) {
        setError("Something went wrong. Please try again.");
      } else {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // No token in URL
  if (!token && error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 24px 60px" }}>
        <div className="anim-fade-up" style={{ width: "100%", maxWidth: 440, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40, textAlign: "center" }}>
          <Logo size={24} />
          <h2 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, marginTop: 24, marginBottom: 16 }}>Invalid Reset Link</h2>
          <p style={{ color: C.textMuted, marginBottom: 24 }}>This reset link is invalid. Please request a new one.</p>
          <button className="btn-primary" style={{ width: "100%" }} onClick={() => navigate("/forgot-password")}>
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 24px 60px" }}>
      <div className="anim-fade-up" style={{ width: "100%", maxWidth: 440, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Logo size={24} />
          <h2 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, marginTop: 24, letterSpacing: "-0.02em" }}>
            Set new password
          </h2>
        </div>

        {success ? (
          <div>
            <div style={{ padding: "16px", borderRadius: 12, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: C.green, fontSize: 15, textAlign: "center", marginBottom: 16 }}>
              Password reset successfully! Redirecting to login...
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, display: "block" }}>New password</label>
              <input
                className="input-field"
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, display: "block" }}>Confirm new password</label>
              <input
                className="input-field"
                type="password"
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>

            {validationError && (
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(237,27,47,0.1)", border: "1px solid rgba(237,27,47,0.2)", color: C.mcgillRed, fontSize: 14 }}>
                {validationError}
              </div>
            )}

            {error && (
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(237,27,47,0.1)", border: "1px solid rgba(237,27,47,0.2)", color: C.mcgillRed, fontSize: 14 }}>
                {error}{" "}
                {error.includes("expired") && (
                  <span style={{ color: C.accent, cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate("/forgot-password")}>
                    Request a new link
                  </span>
                )}
              </div>
            )}

            <button
              className="btn-primary"
              style={{ width: "100%", padding: 15, opacity: loading ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ResetPasswordPage.jsx
git commit -m "feat: add ResetPasswordPage component"
```

---

### Task 3: Wire up routes and forgot password link

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/AuthPage.jsx`

- [ ] **Step 1: Add routes to App.jsx**

In `frontend/src/App.jsx`, add the two new imports at the top with the other page imports:
```jsx
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
```

In the `<Routes>` block, add two new routes (add them BEFORE the `<Route path="*" ...>` catch-all):
```jsx
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

- [ ] **Step 2: Add "Forgot password?" link to AuthPage**

In `frontend/src/pages/AuthPage.jsx`, find the exact password input line (line 67):
```jsx
          <div><label style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, display: "block" }}>Password</label><input className="input-field" type="password" placeholder="Minimum 8 characters" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} /></div>
```

Replace it with this (password input unchanged, forgot link added after it):
```jsx
          <div><label style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, display: "block" }}>Password</label><input className="input-field" type="password" placeholder="Minimum 8 characters" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} /></div>
          {!isSignup && (
            <div style={{ textAlign: "right", marginTop: -8 }}>
              <span
                style={{ fontSize: 13, color: C.textMuted, cursor: "pointer" }}
                onMouseEnter={e => e.target.style.color = C.accent}
                onMouseLeave={e => e.target.style.color = C.textMuted}
                onClick={() => navigate("/forgot-password")}
              >
                Forgot password?
              </span>
            </div>
          )}
```

**Confirmation:** This adds the link only in login mode (`!isSignup`), immediately after the password field, before the error display and submit button — which matches the existing AuthPage JSX structure.
```jsx
{!isSignup && (
  <div style={{ textAlign: "right", marginTop: -8 }}>
    <span
      style={{ fontSize: 13, color: C.textMuted, cursor: "pointer" }}
      onMouseEnter={e => e.target.style.color = C.accent}
      onMouseLeave={e => e.target.style.color = C.textMuted}
      onClick={() => navigate("/forgot-password")}
    >
      Forgot password?
    </span>
  </div>
)}
```

- [ ] **Step 3: Run the frontend build to check for errors**

```bash
cd /Users/hamzasalama/MatchMyRoom/frontend
npm run build 2>&1 | tail -20
```
Expected: Build succeeds with no errors.

- [ ] **Step 4: Manually verify routing in dev mode**

```bash
cd /Users/hamzasalama/MatchMyRoom/frontend
npm run dev &
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/forgot-password
kill %1
```
Expected: `200` (React SPA serves index.html for all routes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx frontend/src/pages/AuthPage.jsx
git commit -m "feat: add /forgot-password and /reset-password routes, link from login page"
```

---

## Chunk 2: Account Deletion

### Task 4: Add account deletion to ProfileEditPage

**Files:**
- Modify: `frontend/src/pages/ProfileEditPage.jsx`
- Modify: `frontend/src/utils/api.js`

- [ ] **Step 1: Add deleteAccount helper to api.js**

In `frontend/src/utils/api.js`, before the closing `export { API_BASE, authFetch };` line, add:

```javascript
// Account management
export const deleteAccount = (userId, token) =>
  authFetch(`${API_BASE}/users/${userId}`, {
    method: "DELETE",
  }, token);

// Block / Report
export const blockUser = (userId, blockedUserId, token) =>
  authFetch(`${API_BASE}/users/${userId}/block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocked_user_id: blockedUserId }),
  }, token);

export const reportUser = (userId, reportedUserId, reason, token) =>
  authFetch(`${API_BASE}/users/${userId}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reported_user_id: reportedUserId, reason }),
  }, token);
```

- [ ] **Step 2: Add danger zone and deletion modal to ProfileEditPage.jsx**

First, add two new state variables at the top of the `ProfileEditPage` component (after the existing state declarations):
```jsx
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [deleteLoading, setDeleteLoading] = useState(false);
const [deleteError, setDeleteError] = useState("");
```

Add the import for `deleteAccount` at the top:
```jsx
import { authFetch, deleteAccount } from "../utils/api";
```

Add the delete handler function (before the `return` statement):
```jsx
const handleDeleteAccount = async () => {
  setDeleteLoading(true);
  setDeleteError("");
  try {
    const response = await deleteAccount(user.user_id, token);
    if (response.ok) {
      localStorage.removeItem("mmr_token");
      localStorage.removeItem("mmr_user");
      navigate("/");
    } else {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  } catch (err) {
    setDeleteError("Something went wrong. Please try again.");
    setDeleteLoading(false);
  }
};
```

In the `ProfileEditPage.jsx` file, the exact anchor is: after the save/cancel buttons div (which ends at line 101: `</div>`) and before the closing `</div>` on line 102 (which closes the outer content wrapper, followed by `</div>` on 103 and `);` on 104). Insert the danger zone JSX between lines 101 and 102. In concrete terms, find this exact closing sequence:

```jsx
          <button className="btn-primary" style={{ flex: 1, padding: "15px", opacity: loading ? 0.7 : 1 }} onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Profile"}</button>
        </div>
      </div>
    </div>
  );
```

And replace it with:

```jsx
          <button className="btn-primary" style={{ flex: 1, padding: "15px", opacity: loading ? 0.7 : 1 }} onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Profile"}</button>
        </div>

        {/* DANGER ZONE — add immediately below the buttons div */}
```
followed by the danger zone JSX below, then the original closing `</div></div>);`

**Actual danger zone JSX to insert:**

```jsx
{/* Danger Zone */}
<div style={{ marginTop: 48, borderTop: `1px solid rgba(200,0,0,0.2)`, paddingTop: 32 }}>
  <div style={{ marginBottom: 16 }}>
    <h3 style={{ fontFamily: font.display, fontSize: 20, fontWeight: 600, color: "#c00", marginBottom: 6 }}>Danger Zone</h3>
    <p style={{ fontSize: 14, color: C.textMuted }}>Once you delete your account, there is no going back.</p>
  </div>
  <button
    onClick={() => setShowDeleteModal(true)}
    style={{ padding: "12px 24px", background: "rgba(200,0,0,0.1)", border: "1px solid rgba(200,0,0,0.3)", color: "#c00", borderRadius: 10, fontFamily: font.body, fontWeight: 600, fontSize: 14, cursor: "pointer" }}
    onMouseEnter={e => { e.target.style.background = "rgba(200,0,0,0.2)"; }}
    onMouseLeave={e => { e.target.style.background = "rgba(200,0,0,0.1)"; }}
  >
    Delete My Account
  </button>
</div>

{/* Delete Confirmation Modal */}
{showDeleteModal && (
  <div onClick={() => setShowDeleteModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40, maxWidth: 420, width: "100%" }}>
      <h3 style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Delete Your Account</h3>
      <p style={{ color: C.textMuted, fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
        This will permanently delete your account, profile, matches, and messages. <strong style={{ color: C.text }}>This cannot be undone.</strong>
      </p>
      {deleteError && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(237,27,47,0.1)", border: "1px solid rgba(237,27,47,0.2)", color: "#c00", fontSize: 14, marginBottom: 16 }}>
          {deleteError}
        </div>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          className="btn-secondary"
          style={{ flex: 1 }}
          onClick={() => { setShowDeleteModal(false); setDeleteError(""); }}
          disabled={deleteLoading}
        >
          Cancel
        </button>
        <button
          onClick={handleDeleteAccount}
          disabled={deleteLoading}
          style={{ flex: 1, padding: "14px 24px", background: "#c00", border: "none", color: "white", borderRadius: 12, fontFamily: font.body, fontWeight: 600, fontSize: 15, cursor: deleteLoading ? "not-allowed" : "pointer", opacity: deleteLoading ? 0.7 : 1 }}
        >
          {deleteLoading ? "Deleting..." : "Delete Forever"}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Run build to verify no errors**

```bash
cd /Users/hamzasalama/MatchMyRoom/frontend
npm run build 2>&1 | tail -20
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ProfileEditPage.jsx frontend/src/utils/api.js
git commit -m "feat: add account deletion danger zone and confirmation modal to ProfileEditPage"
```

---

## Chunk 3: Block and Report

### Task 5: Add block/report to ProfileModal

**Files:**
- Modify: `frontend/src/components/ProfileModal.jsx`

- [ ] **Step 1: Read the full current ProfileModal**

Read the entire file to understand the existing close/action buttons structure:
```bash
cat /Users/hamzasalama/MatchMyRoom/frontend/src/components/ProfileModal.jsx
```

- [ ] **Step 2: Update ProfileModal to accept currentUser and onBlock props**

The existing signature is `ProfileModal({ profileData, onClose })`. Update it to:
```jsx
export default function ProfileModal({ profileData, onClose, currentUser, onBlock }) {
```

- [ ] **Step 3: Add block/report state variables inside ProfileModal**

Add these state declarations at the top of the component (after the `if (!profileData) return null;` guard):
```jsx
const [showReportModal, setShowReportModal] = useState(false);
const [reportReason, setReportReason] = useState("Harassment");
const [actionLoading, setActionLoading] = useState(false);
const [actionMessage, setActionMessage] = useState("");
const [actionError, setActionError] = useState("");
```

Add the `useState` import if not already present:
```jsx
import { useState } from "react";
```

- [ ] **Step 4: Add block/report handlers inside ProfileModal**

Add these handler functions before the `return` statement:

```jsx
const handleBlock = async () => {
  if (!currentUser) return;
  setActionLoading(true);
  setActionError("");
  try {
    const { blockUser } = await import("../utils/api");
    const response = await blockUser(currentUser.user_id, profileData.user_id, currentUser.token);
    if (response.ok) {
      setActionMessage("User blocked.");
      setTimeout(() => {
        if (onBlock) onBlock(profileData.user_id);
        onClose();
      }, 1000);
    } else {
      const data = await response.json();
      if (data.detail && data.detail.includes("already blocked")) {
        setActionError("You have already blocked this user.");
      } else {
        setActionError("Something went wrong.");
      }
    }
  } catch (err) {
    setActionError("Something went wrong.");
  } finally {
    setActionLoading(false);
  }
};

const handleReport = async () => {
  if (!currentUser) return;
  setActionLoading(true);
  setActionError("");
  try {
    const { reportUser } = await import("../utils/api");
    const response = await reportUser(currentUser.user_id, profileData.user_id, reportReason, currentUser.token);
    if (response.ok) {
      setActionMessage("Report submitted. Thank you.");
      setTimeout(() => {
        setShowReportModal(false);
        onClose();
      }, 1500);
    } else {
      setActionError("Something went wrong.");
    }
  } catch (err) {
    setActionError("Something went wrong.");
  } finally {
    setActionLoading(false);
  }
};
```

**Note on token:** `currentUser` is the object stored in `mmr_user` localStorage. It contains `user_id` but `token` is stored separately as `mmr_token`. The caller (DashboardPage) needs to pass both. Update the handler to accept this reality:

```jsx
const handleBlock = async () => {
  if (!currentUser) return;
  const token = localStorage.getItem("mmr_token");
  setActionLoading(true);
  setActionError("");
  try {
    const { blockUser } = await import("../utils/api");
    const response = await blockUser(currentUser.user_id, profileData.user_id, token);
    // ... rest of handler
```

Same pattern for `handleReport`.

- [ ] **Step 5: Add the block/report UI section to ProfileModal's JSX**

Find the closing `</div>` of the `<div style={{ padding: 24 }}>` section (the main content area). Before that closing `</div>`, add:

```jsx
          {/* Block / Report Actions (only show if viewing someone else's profile) */}
          {currentUser && currentUser.user_id !== profileData.user_id && (
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 8 }}>
              {actionMessage && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: C.green, fontSize: 14, marginBottom: 12 }}>
                  {actionMessage}
                </div>
              )}
              {actionError && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(237,27,47,0.1)", border: "1px solid rgba(237,27,47,0.2)", color: "#c00", fontSize: 14, marginBottom: 12 }}>
                  {actionError}
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleBlock}
                  disabled={actionLoading}
                  style={{ flex: 1, padding: "10px 16px", background: C.surfaceLight, border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 10, fontFamily: font.body, fontSize: 13, fontWeight: 500, cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.6 : 1 }}
                  onMouseEnter={e => { e.target.style.borderColor = "#888"; e.target.style.color = C.text; }}
                  onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.textMuted; }}
                >
                  Block User
                </button>
                <button
                  onClick={() => { setShowReportModal(true); setActionError(""); }}
                  disabled={actionLoading}
                  style={{ flex: 1, padding: "10px 16px", background: C.surfaceLight, border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 10, fontFamily: font.body, fontSize: 13, fontWeight: 500, cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.6 : 1 }}
                  onMouseEnter={e => { e.target.style.borderColor = "#888"; e.target.style.color = C.text; }}
                  onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.textMuted; }}
                >
                  Report User
                </button>
              </div>
            </div>
          )}

          {/* Report Modal */}
          {showReportModal && (
            <div onClick={() => setShowReportModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 3500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, maxWidth: 400, width: "100%" }}>
                <h3 style={{ fontFamily: font.display, fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Report User</h3>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 8, display: "block" }}>Reason</label>
                  <select
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    style={{ width: "100%", padding: "12px 16px", background: C.surfaceLight, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: font.body, fontSize: 14, cursor: "pointer" }}
                  >
                    <option value="Harassment">Harassment</option>
                    <option value="Fake Profile">Fake Profile</option>
                    <option value="Inappropriate Content">Inappropriate Content</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {actionError && (
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(237,27,47,0.1)", border: "1px solid rgba(237,27,47,0.2)", color: "#c00", fontSize: 14, marginBottom: 16 }}>
                    {actionError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, padding: "12px" }}
                    onClick={() => { setShowReportModal(false); setActionError(""); }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={actionLoading}
                    style={{ flex: 1, padding: "12px 20px", background: C.accent, border: "none", color: "white", borderRadius: 12, fontFamily: font.body, fontWeight: 600, fontSize: 14, cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.7 : 1 }}
                  >
                    {actionLoading ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </div>
            </div>
          )}
```

- [ ] **Step 6: Update ALL three ProfileModal callers**

`ProfileModal` is used in exactly 3 files. Update each:

**1. `frontend/src/pages/SwipeInterface.jsx` (line 88):**

Read the file first. Find:
```jsx
<ProfileModal profileData={profileModal} onClose={() => setProfileModal(null)} />
```
Replace with:
```jsx
<ProfileModal
  profileData={profileModal}
  onClose={() => setProfileModal(null)}
  currentUser={user}
  onBlock={(blockedUserId) => {
    setMatches(prev => prev.filter(m => m.user_id !== blockedUserId));
    setProfileModal(null);
  }}
/>
```
`SwipeInterface` receives `user` and `matches`/`setMatches` as props from `DashboardPage` — read the component signature to confirm these names.

**2. `frontend/src/pages/MessagesPage.jsx` (line 67):**

Read the file first. Find:
```jsx
<ProfileModal profileData={profileModalData} onClose={() => setShowProfileModal(false)} />
```
Replace with:
```jsx
<ProfileModal
  profileData={profileModalData}
  onClose={() => setShowProfileModal(false)}
  currentUser={user}
  onBlock={() => setShowProfileModal(false)}
/>
```
In MessagesPage, blocking from a message thread just closes the modal — the messages page doesn't have a removable match list. `user` is a prop of `MessagesPage`.

**3. There is no ProfileModal usage in `DashboardPage.jsx` directly** — it delegates to `SwipeInterface`. No edit needed in `DashboardPage.jsx`.

After updating all callers, verify that `user` is available in both `SwipeInterface` and `MessagesPage` component props. If not, thread it down from the parent that calls these components.

- [ ] **Step 7: Run build**

```bash
cd /Users/hamzasalama/MatchMyRoom/frontend
npm run build 2>&1 | tail -20
```
Expected: Build succeeds with no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ProfileModal.jsx
git commit -m "feat: add block/report buttons and report modal to ProfileModal"
```

---

## Chunk 4: Final Verification

### Task 6: End-to-end frontend verification

- [ ] **Step 1: Run final build**

```bash
cd /Users/hamzasalama/MatchMyRoom/frontend
npm run build 2>&1
```
Expected: Build completes with no errors, no TypeScript/JSX errors.

- [ ] **Step 2: Start dev server and manually verify all new pages load**

```bash
cd /Users/hamzasalama/MatchMyRoom/frontend
npm run dev &
sleep 3
echo "Testing /forgot-password..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/forgot-password
echo ""
echo "Testing /reset-password..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/reset-password
echo ""
kill %1
```
Expected: Both return `200`.

- [ ] **Step 3: Verify "Forgot password?" link visible on login page**

Open browser at `http://localhost:5173/login` and confirm "Forgot password?" appears below the password field. (Or inspect the AuthPage.jsx source to confirm the conditional renders for `!isSignup`.)

- [ ] **Step 4: Final commit**

```bash
cd /Users/hamzasalama/MatchMyRoom
git add -A
git commit -m "feat: complete frontend features — password reset flow, account deletion, block/report UI"
```
