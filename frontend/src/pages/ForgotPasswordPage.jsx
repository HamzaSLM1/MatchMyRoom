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
            <div style={{ padding: "16px", borderRadius: 12, background: "var(--success-bg)", border: "1px solid var(--success-border)", color: "#10B981", fontSize: 15, textAlign: "center", marginBottom: 24 }}>
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
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error)", fontSize: 14 }}>
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
