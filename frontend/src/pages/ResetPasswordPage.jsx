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
