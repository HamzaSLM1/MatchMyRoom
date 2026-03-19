import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, font } from "../theme/colors";
import { applyTheme } from "../theme/colors";
import Logo from "../components/Logo";

export default function AuthPage({ mode, onAuth, setPendingEmail, setDevCode }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  const handleSubmit = async () => {
    setError("");
    if (isSignup && !name.trim()) return setError("Name is required");
    if (!email.includes("@")) return setError("Enter a valid email");
    if (isSignup && !(email.endsWith("@mcgill.ca") || email.endsWith("@mail.mcgill.ca") || email.endsWith("@concordia.ca") || email.endsWith("@live.concordia.ca"))) {
      return setError("Only McGill or Concordia emails are allowed");
    }
    if (password.length < 8) return setError("Password must be at least 8 characters");

    setLoading(true);
    try {
      const endpoint = isSignup ? `/api/signup` : `/api/login`;
      const body = isSignup ? { name, email, password } : { email, password };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 403 && !isSignup) {
          setPendingEmail(email);
          navigate("/verify");
          setLoading(false);
          return;
        }
        setError(data.detail || "An error occurred");
        setLoading(false);
        return;
      }

      if (isSignup) {
        setPendingEmail(email);
        if (data.dev_code) setDevCode(data.dev_code);
        setLoading(false);
        navigate("/verify");
      } else {
        applyTheme(data.university);
        setLoading(false);
        onAuth(data);
      }
    } catch (err) { setError("Network error. Please try again."); setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 80, padding: "120px 24px 60px" }}>
      <div className="anim-fade-up" style={{ width: "100%", maxWidth: 440, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Logo size={24} />
          <h2 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, marginTop: 24, letterSpacing: "-0.02em" }}>{isSignup ? "Create your account" : "Welcome back"}</h2>
          <p style={{ color: C.textMuted, fontSize: 14, marginTop: 8 }}>{isSignup ? "Use your McGill or Concordia email to get started" : "Log in to see your matches"}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isSignup && <div><label style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, display: "block" }}>Full name</label><input className="input-field" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} /></div>}
          <div><label style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, display: "block" }}>Email</label><input className="input-field" type="email" placeholder="firstname.lastname@mail.mcgill.ca" value={email} onChange={e => setEmail(e.target.value)} /></div>
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
          {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(237,27,47,0.1)", border: "1px solid rgba(237,27,47,0.2)", color: C.mcgillRed, fontSize: 14 }}>{error}</div>}
          <button className="btn-primary" style={{ width: "100%", padding: "15px", marginTop: 8, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>{loading ? "Please wait..." : isSignup ? "Create account" : "Log in"}</button>
        </div>
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: C.textMuted }}>
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <span style={{ color: C.accent, cursor: "pointer", fontWeight: 500 }} onClick={() => navigate(isSignup ? "/login" : "/signup")}>{isSignup ? "Log in" : "Sign up"}</span>
        </div>
      </div>
    </div>
  );
}
