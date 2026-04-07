import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, font } from "../theme/colors";
import { Mail, MailCheck, Wrench, CheckCircle } from "lucide-react";

export default function VerifyEmailPage({ email, devCode }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleVerify = async () => {
    setError("");
    if (code.length !== 6) return setError("Please enter the 6-digit code");

    setLoading(true);
    try {
      const response = await fetch(`/api/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Invalid code");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/resend-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (response.ok) {
        setError("");
        alert("New code sent! Check your inbox.");
      } else {
        setError(data.detail || "Failed to resend code");
      }
      setLoading(false);
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 80, padding: "120px 24px 60px" }}>
      <div className="anim-fade-up" style={{ width: "100%", maxWidth: 440, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <Mail size={48} color="var(--accent)" />
          </div>
          <h2 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, marginTop: 24, letterSpacing: "-0.02em" }}>Check your email</h2>
          <p style={{ color: C.textMuted, fontSize: 14, marginTop: 8 }}>
            We sent a 6-digit verification code to<br />
            <strong style={{ color: C.accent }}>{email}</strong>
          </p>
          <p style={{ color: C.textMuted, fontSize: 13, marginTop: 12, padding: "10px 16px", background: C.surfaceLight, borderRadius: 8 }}>
            <strong style={{ color: C.text, display: "inline-flex", alignItems: "center" }}><MailCheck size={14} style={{ display: "inline", marginRight: 6 }} />Check your junk/spam folder</strong> if you don't see it in your inbox
          </p>
          {devCode && (
            <div style={{ marginTop: 12, padding: "12px 16px", background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Wrench size={14} /> Dev mode — your code:</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#10B981", letterSpacing: "6px", fontFamily: "monospace" }}>{devCode}</div>
            </div>
          )}
        </div>

        {success ? (
          <div style={{ padding: "20px", borderRadius: 12, background: "var(--success-bg)", border: "1px solid var(--success-border)", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <CheckCircle size={32} color="#10B981" />
            </div>
            <div style={{ color: "#10B981", fontWeight: 600 }}>Email verified!</div>
            <div style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>Redirecting to login...</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, display: "block" }}>Verification Code</label>
                <input
                  className="input-field"
                  placeholder="000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === "Enter" && handleVerify()}
                  style={{ fontSize: 24, letterSpacing: "8px", textAlign: "center", fontFamily: "monospace" }}
                  maxLength={6}
                  autoFocus
                />
              </div>

              {error && (
                <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error)", fontSize: 14 }}>
                  {error}
                </div>
              )}

              <button
                className="btn-primary"
                style={{ width: "100%", padding: "15px", marginTop: 8, opacity: loading ? 0.7 : 1 }}
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>
            </div>

            <div style={{ textAlign: "center", marginTop: 24 }}>
              <p style={{ fontSize: 13, color: C.textMuted }}>
                Didn't receive the code?
              </p>
              <button
                onClick={handleResend}
                disabled={loading}
                style={{
                  marginTop: 8,
                  background: "none",
                  border: "none",
                  color: C.accent,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "underline"
                }}
              >
                Resend code
              </button>
            </div>

            <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: C.textMuted }}>
              <span
                style={{ color: C.accent, cursor: "pointer", fontWeight: 500 }}
                onClick={() => navigate("/login")}
              >
                ← Back to login
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
