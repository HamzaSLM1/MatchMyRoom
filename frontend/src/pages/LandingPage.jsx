import { useNavigate } from "react-router-dom";
import { C, font } from "../theme/colors";
import Logo from "../components/Logo";
import { Home, ClipboardList, Target, Users } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", paddingTop: 80 }}>
      <section className="landing-hero" style={{ minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 24px", position: "relative", overflow: "hidden" }}>

        <div className="anim-fade-up" style={{ animationDelay: "0.1s", zIndex: 1 }}>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "8px 20px", borderRadius: 100, background: C.accentGlow, border: `1px solid rgba(99,102,241,0.25)`, color: C.accent, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 32 }}>
            <Home size={14} style={{ display: "inline", marginRight: 6 }} />Built for McGill & Concordia students
          </span>
        </div>
        <h1 className="anim-fade-up" style={{ fontFamily: font.display, fontSize: "clamp(42px, 7vw, 80px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", maxWidth: 800, marginBottom: 24, animationDelay: "0.2s" }}>
          Find your <span style={{ background: "linear-gradient(135deg, var(--accent), #A5B4FC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>perfect</span><br />roommate
        </h1>
        <p className="anim-fade-up" style={{ fontSize: 19, color: C.textMuted, maxWidth: 520, lineHeight: 1.7, marginBottom: 48, animationDelay: "0.35s" }}>
          Answer a quick questionnaire about your lifestyle, and we'll match you with compatible students at McGill or Concordia looking for roommates in Montréal.
        </p>
        <div className="anim-fade-up landing-cta-buttons" style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", animationDelay: "0.5s" }}>
          <button className="btn-primary" style={{ padding: "16px 40px", fontSize: 16 }} onClick={() => navigate("/signup")}>Get matched →</button>
          <button className="btn-secondary" style={{ padding: "16px 40px", fontSize: 16 }} onClick={() => navigate("/login")}>I have an account</button>
        </div>

        {/* Scroll indicator */}
        <div className="anim-fade-up" style={{ animationDelay: "0.8s", position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 1, cursor: "pointer" }} onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}>
          <span style={{ fontSize: 12, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500 }}>Scroll to learn more</span>
          <div style={{ width: 24, height: 38, border: `2px solid ${C.border}`, borderRadius: 12, display: "flex", justifyContent: "center", paddingTop: 6 }}>
            <div style={{ width: 4, height: 8, borderRadius: 2, background: C.accent, animation: "scrollDot 1.5s ease-in-out infinite" }} />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="landing-how-it-works" style={{ padding: "100px 24px 120px", position: "relative", overflow: "hidden" }}>

        <h2 className="anim-fade-up" style={{ fontFamily: font.display, fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, textAlign: "center", marginBottom: 16, letterSpacing: "-0.02em" }}>
          How it <span style={{ background: "linear-gradient(135deg, var(--accent), #A5B4FC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>works</span>
        </h2>
        <p className="anim-fade-up" style={{ textAlign: "center", color: C.textMuted, fontSize: 17, maxWidth: 480, margin: "0 auto 64px", lineHeight: 1.6 }}>
          Three simple steps to find your ideal roommate
        </p>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 48, maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div className="landing-timeline-line" style={{ position: "absolute", top: 60, bottom: 60, left: "50%", width: 2, background: "linear-gradient(to bottom, transparent, var(--border), transparent)", transform: "translateX(-50%)", zIndex: 0 }} />

          {[
            { step: "1", icon: <ClipboardList size={20} color="white" />, title: "Sign up & verify", description: "Create your account with your McGill or Concordia email. We verify you're a real student to keep the community safe and trusted." },
            { step: "2", icon: <Target size={20} color="white" />, title: "Take the questionnaire", description: "Answer quick questions about your lifestyle — sleep schedule, cleanliness, noise preferences, budget, and more. It only takes a couple of minutes." },
            { step: "3", icon: <Users size={20} color="white" />, title: "Get matched & connect", description: "Our algorithm finds your most compatible roommates. Swipe through your matches, see compatibility scores, and message the ones you vibe with." },
          ].map((item, i) => (
            <div key={i} className="anim-fade-up landing-step-row" style={{ animationDelay: `${0.15 * i}s`, display: "flex", alignItems: i % 2 === 0 ? "flex-start" : "flex-end", flexDirection: "column", width: "100%", position: "relative", zIndex: 1 }}>
              <div className="landing-step-card" style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 24,
                padding: "36px 40px",
                maxWidth: 420,
                position: "relative",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                alignSelf: i % 2 === 0 ? "flex-start" : "flex-end",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"; }}
              >
                <div style={{
                  position: "absolute",
                  bottom: -10,
                  [i % 2 === 0 ? "left" : "right"]: 48,
                  width: 20,
                  height: 20,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderTop: "none",
                  borderLeft: i % 2 === 0 ? "none" : `1px solid ${C.border}`,
                  borderRight: i % 2 === 0 ? `1px solid ${C.border}` : "none",
                  transform: "rotate(45deg)",
                  borderRadius: "0 0 4px 0",
                }} />
                <div style={{
                  position: "absolute",
                  top: -16,
                  [i % 2 === 0 ? "left" : "right"]: 24,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent), #A5B4FC)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: font.display,
                  fontSize: 14,
                  fontWeight: 800,
                  color: "white",
                }}>{item.step}</div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #A5B4FC)", marginBottom: 12 }}>
                  {item.icon}
                </div>
                <h3 style={{ fontFamily: font.display, fontSize: 22, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.01em" }}>{item.title}</h3>
                <p style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.7 }}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="anim-fade-up" style={{ textAlign: "center", marginTop: 80 }}>
          <p style={{ color: C.textMuted, fontSize: 17, marginBottom: 24, fontFamily: font.body }}>Ready to find your roommate?</p>
          <button className="btn-primary" style={{ padding: "16px 40px", fontSize: 16 }} onClick={() => navigate("/signup")}>Get started →</button>
        </div>
      </section>

      <footer className="landing-footer" style={{ padding: "32px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1000, margin: "0 auto", fontSize: 13, color: C.textDim }}>
        <Logo size={20} />
        <span>© 2025 MatchMyRoom · Built for McGill & Concordia students</span>
      </footer>
    </div>
  );
}
