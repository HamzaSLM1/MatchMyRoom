import { useState, useEffect, useRef } from "react";

const FONTS_LINK = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,400&display=swap";

// ─── Theme ───
const C = {
  bg: "#0C0A09",
  surface: "#1C1917",
  surfaceLight: "#292524",
  border: "#3F3B37",
  text: "#FAFAF9",
  textMuted: "#A8A29E",
  textDim: "#78716C",
  accent: "#F97316",
  accentSoft: "#FB923C",
  accentGlow: "rgba(249,115,22,0.15)",
  mcgill: "#ED1B2F",
  mcgillDark: "#B91C1C",
  green: "#22C55E",
  greenSoft: "#4ADE80",
};

const font = {
  display: "'Fraunces', serif",
  body: "'DM Sans', sans-serif",
};

// ─── Styles ───
const globalStyles = `
  @import url('${FONTS_LINK}');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; color: ${C.text}; font-family: ${font.body}; }
  ::selection { background: ${C.accent}; color: ${C.bg}; }
  input:focus, textarea:focus { outline: none; }
  
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes matchReveal {
    0% { opacity: 0; transform: scale(0.9) translateY(20px); }
    60% { transform: scale(1.02) translateY(-4px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes compatPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.08); }
    100% { transform: scale(1); }
  }
  @keyframes progressFill {
    from { width: 0%; }
  }

  .anim-fade-up { animation: fadeUp 0.7s ease-out both; }
  .anim-fade-in { animation: fadeIn 0.5s ease-out both; }
  .anim-slide-in { animation: slideIn 0.5s ease-out both; }
  
  .btn-primary {
    background: ${C.accent};
    color: ${C.bg};
    border: none;
    padding: 14px 32px;
    border-radius: 12px;
    font-family: ${font.body};
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.25s ease;
    letter-spacing: 0.02em;
  }
  .btn-primary:hover {
    background: ${C.accentSoft};
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(249,115,22,0.3);
  }
  .btn-secondary {
    background: transparent;
    color: ${C.text};
    border: 1.5px solid ${C.border};
    padding: 14px 32px;
    border-radius: 12px;
    font-family: ${font.body};
    font-weight: 500;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.25s ease;
  }
  .btn-secondary:hover {
    border-color: ${C.accent};
    color: ${C.accent};
    transform: translateY(-2px);
  }

  .input-field {
    width: 100%;
    padding: 14px 16px;
    background: ${C.surface};
    border: 1.5px solid ${C.border};
    border-radius: 10px;
    color: ${C.text};
    font-family: ${font.body};
    font-size: 15px;
    transition: border-color 0.2s ease;
  }
  .input-field:focus {
    border-color: ${C.accent};
  }
  .input-field::placeholder {
    color: ${C.textDim};
  }
`;

// ─── Questionnaire Data ───
const questions = [
  {
    id: "sleepSchedule",
    question: "What's your typical sleep schedule?",
    icon: "🌙",
    options: ["Early bird (before 10pm)", "Night owl (after midnight)", "Somewhere in between", "Irregular / varies"],
  },
  {
    id: "cleanliness",
    question: "How would you describe your cleanliness?",
    icon: "✨",
    options: ["Spotless at all times", "Tidy, clean weekly", "Organized chaos", "I'll get to it eventually"],
  },
  {
    id: "noise",
    question: "Your ideal noise level at home?",
    icon: "🔊",
    options: ["Library silence", "Background music is fine", "I like it lively", "Depends on the day"],
  },
  {
    id: "guests",
    question: "How do you feel about having guests over?",
    icon: "🚪",
    options: ["Rarely / never", "Occasionally with notice", "Friends welcome anytime", "The more the merrier"],
  },
  {
    id: "study",
    question: "Where do you usually study?",
    icon: "📚",
    options: ["Always at home", "Libraries & cafés", "Mix of both", "I study on the go"],
  },
  {
    id: "budget",
    question: "Monthly rent budget (your share)?",
    icon: "💰",
    options: ["Under $600", "$600–$800", "$800–$1000", "$1000+"],
  },
  {
    id: "location",
    question: "Preferred area in Montréal?",
    icon: "📍",
    options: ["Milton-Parc / Ghetto", "Plateau Mont-Royal", "Downtown", "Flexible / no preference"],
  },
  {
    id: "moveIn",
    question: "When are you looking to move in?",
    icon: "📅",
    options: ["September 2025", "January 2026", "May 2026", "ASAP / Flexible"],
  },
];

// ─── Mock Matches ───
const mockMatches = [
  { name: "Amélie Tremblay", program: "Psychology, U2", compat: 94, avatar: "AT", sleep: "Night owl", clean: "Tidy", area: "Plateau", budget: "$700" },
  { name: "James Chen", program: "Computer Science, U3", compat: 89, avatar: "JC", sleep: "Night owl", clean: "Organized chaos", area: "Milton-Parc", budget: "$650" },
  { name: "Sofia Russo", program: "Political Science, U1", compat: 85, avatar: "SR", sleep: "In between", clean: "Tidy", area: "Downtown", budget: "$800" },
  { name: "Kofi Mensah", program: "Engineering, U2", compat: 81, avatar: "KM", sleep: "Early bird", clean: "Spotless", area: "Milton-Parc", budget: "$600" },
  { name: "Priya Sharma", program: "Biology, U2", compat: 78, avatar: "PS", sleep: "In between", clean: "Tidy", area: "Plateau", budget: "$750" },
];

// ─── Components ───

function Logo({ size = 28 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <div style={{
        width: size + 6, height: size + 6, borderRadius: 10,
        background: `linear-gradient(135deg, ${C.accent}, ${C.mcgill})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.55, fontWeight: 700, color: "white",
        fontFamily: font.display, boxShadow: `0 4px 16px rgba(249,115,22,0.3)`,
      }}>M</div>
      <span style={{ fontFamily: font.display, fontSize: size * 0.75, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>
        Match<span style={{ color: C.accent }}>My</span>Room
      </span>
    </div>
  );
}

function NavBar({ page, setPage, isLoggedIn }) {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      padding: "16px 32px",
      background: "rgba(12,10,9,0.85)", backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${C.border}`,
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <div onClick={() => setPage("landing")}><Logo /></div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {isLoggedIn ? (
          <>
            <button className="btn-secondary" style={{ padding: "10px 20px", fontSize: 14 }}
              onClick={() => setPage("dashboard")}>Dashboard</button>
            <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}
              onClick={() => setPage("landing")}>Log out</button>
          </>
        ) : (
          <>
            <button className="btn-secondary" style={{ padding: "10px 20px", fontSize: 14 }}
              onClick={() => setPage("login")}>Log in</button>
            <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}
              onClick={() => setPage("signup")}>Sign up</button>
          </>
        )}
      </div>
    </nav>
  );
}

// ─── Landing Page ───
function LandingPage({ setPage }) {
  return (
    <div style={{ minHeight: "100vh", paddingTop: 80 }}>
      {/* Hero */}
      <section style={{
        minHeight: "90vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "60px 24px", position: "relative", overflow: "hidden",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
          width: 800, height: 800, borderRadius: "50%",
          background: `radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: "10%", right: "10%", width: 300, height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(237,27,47,0.06) 0%, transparent 70%)`,
          pointerEvents: "none", animation: "float 6s ease-in-out infinite",
        }} />

        <div className="anim-fade-up" style={{ animationDelay: "0.1s" }}>
          <span style={{
            display: "inline-block", padding: "8px 20px", borderRadius: 100,
            background: C.accentGlow, border: `1px solid rgba(249,115,22,0.2)`,
            color: C.accent, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em",
            textTransform: "uppercase", marginBottom: 32,
          }}>
            🏠 Built for McGill students
          </span>
        </div>

        <h1 className="anim-fade-up" style={{
          fontFamily: font.display, fontSize: "clamp(42px, 7vw, 80px)",
          fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em",
          maxWidth: 800, marginBottom: 24, animationDelay: "0.2s",
        }}>
          Find your <span style={{
            background: `linear-gradient(135deg, ${C.accent}, ${C.mcgill})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>perfect</span><br />roommate
        </h1>

        <p className="anim-fade-up" style={{
          fontSize: 19, color: C.textMuted, maxWidth: 520,
          lineHeight: 1.7, marginBottom: 48, animationDelay: "0.35s",
        }}>
          Answer a quick questionnaire about your lifestyle, and we'll match you with compatible McGill students looking for roommates in Montréal.
        </p>

        <div className="anim-fade-up" style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", animationDelay: "0.5s" }}>
          <button className="btn-primary" style={{ padding: "16px 40px", fontSize: 16 }}
            onClick={() => setPage("signup")}>Get matched →</button>
          <button className="btn-secondary" style={{ padding: "16px 40px", fontSize: 16 }}
            onClick={() => setPage("login")}>I have an account</button>
        </div>

        {/* Stats */}
        <div className="anim-fade-up" style={{
          display: "flex", gap: 48, marginTop: 80, animationDelay: "0.65s",
        }}>
          {[
            { num: "1,200+", label: "Students matched" },
            { num: "94%", label: "Compatibility rate" },
            { num: "2 min", label: "To complete" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: C.accent }}>{s.num}</div>
              <div style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: "100px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 className="anim-fade-up" style={{
          fontFamily: font.display, fontSize: 36, fontWeight: 700,
          textAlign: "center", marginBottom: 64, letterSpacing: "-0.02em",
        }}>
          How it works
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
          {[
            { step: "01", icon: "📧", title: "Verify your McGill email", desc: "Sign up with your @mcgill.ca or @mail.mcgill.ca address to join the verified community." },
            { step: "02", icon: "📝", title: "Complete the questionnaire", desc: "Tell us about your sleep schedule, cleanliness, budget, preferred area, and more." },
            { step: "03", icon: "🤝", title: "Get matched", desc: "Our algorithm finds students with compatible lifestyles and sends you both an email." },
          ].map((item, i) => (
            <div key={i} className="anim-fade-up" style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: 32, animationDelay: `${0.1 + i * 0.15}s`,
              transition: "all 0.3s ease", cursor: "default",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ fontSize: 36, marginBottom: 16 }}>{item.icon}</div>
              <div style={{ fontFamily: font.display, fontSize: 13, color: C.accent, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>{item.step}</div>
              <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 600, marginBottom: 12 }}>{item.title}</div>
              <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: "80px 24px", textAlign: "center",
        background: `linear-gradient(180deg, transparent, ${C.accentGlow})`,
      }}>
        <h2 style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
          Ready to find your roommate?
        </h2>
        <p style={{ color: C.textMuted, fontSize: 16, marginBottom: 32, maxWidth: 400, margin: "0 auto 32px" }}>
          Join hundreds of McGill students already using MatchMyRoom.
        </p>
        <button className="btn-primary" style={{ padding: "16px 48px", fontSize: 16 }}
          onClick={() => setPage("signup")}>Sign up free →</button>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "32px 24px", borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        maxWidth: 1000, margin: "0 auto", fontSize: 13, color: C.textDim,
      }}>
        <Logo size={20} />
        <span>© 2025 MatchMyRoom · Built for McGill students</span>
      </footer>
    </div>
  );
}

// ─── Auth Pages ───
function AuthPage({ mode, setPage, onAuth }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const handleSubmit = () => {
    setError("");
    if (isSignup && !name.trim()) return setError("Name is required");
    if (!email.includes("@")) return setError("Enter a valid email");
    if (isSignup && !(email.endsWith("@mcgill.ca") || email.endsWith("@mail.mcgill.ca"))) {
      return setError("Only McGill emails (@mcgill.ca or @mail.mcgill.ca) are allowed");
    }
    if (password.length < 8) return setError("Password must be at least 8 characters");

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onAuth({ name: name || "Student", email });
    }, 1200);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      paddingTop: 80, padding: "120px 24px 60px",
    }}>
      <div className="anim-fade-up" style={{
        width: "100%", maxWidth: 440, background: C.surface,
        border: `1px solid ${C.border}`, borderRadius: 20, padding: 40,
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Logo size={24} />
          <h2 style={{
            fontFamily: font.display, fontSize: 28, fontWeight: 700,
            marginTop: 24, letterSpacing: "-0.02em",
          }}>
            {isSignup ? "Create your account" : "Welcome back"}
          </h2>
          <p style={{ color: C.textMuted, fontSize: 14, marginTop: 8 }}>
            {isSignup ? "Use your McGill email to get started" : "Log in to see your matches"}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isSignup && (
            <div>
              <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, display: "block" }}>Full name</label>
              <input className="input-field" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, display: "block" }}>McGill email</label>
            <input className="input-field" type="email" placeholder="firstname.lastname@mail.mcgill.ca"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, display: "block" }}>Password</label>
            <input className="input-field" type="password" placeholder="Minimum 8 characters"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>

          {error && (
            <div style={{
              padding: "12px 16px", borderRadius: 10,
              background: "rgba(237,27,47,0.1)", border: "1px solid rgba(237,27,47,0.2)",
              color: C.mcgill, fontSize: 14,
            }}>{error}</div>
          )}

          <button className="btn-primary" style={{
            width: "100%", padding: "15px", marginTop: 8,
            opacity: loading ? 0.7 : 1,
          }} onClick={handleSubmit} disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Create account" : "Log in"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: C.textMuted }}>
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <span style={{ color: C.accent, cursor: "pointer", fontWeight: 500 }}
            onClick={() => setPage(isSignup ? "login" : "signup")}>
            {isSignup ? "Log in" : "Sign up"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Questionnaire ───
function QuestionnairePage({ setPage, onComplete }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);

  const q = questions[current];
  const progress = ((current) / questions.length) * 100;

  const handleNext = () => {
    if (selected === null) return;
    const updated = { ...answers, [q.id]: selected };
    setAnswers(updated);
    setSelected(null);

    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      onComplete(updated);
    }
  };

  const handleBack = () => {
    if (current > 0) {
      setCurrent(current - 1);
      setSelected(answers[questions[current - 1].id] ?? null);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      paddingTop: 80, padding: "120px 24px 60px",
    }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Progress */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: C.textDim }}>Question {current + 1} of {questions.length}</span>
            <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 4, background: C.surfaceLight, borderRadius: 100, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 100,
              background: `linear-gradient(90deg, ${C.accent}, ${C.mcgill})`,
              width: `${progress}%`, transition: "width 0.5s ease",
              animation: "progressFill 0.5s ease-out",
            }} />
          </div>
        </div>

        {/* Question */}
        <div key={current} className="anim-fade-up">
          <div style={{ fontSize: 48, marginBottom: 16 }}>{q.icon}</div>
          <h2 style={{
            fontFamily: font.display, fontSize: 28, fontWeight: 700,
            marginBottom: 32, letterSpacing: "-0.02em", lineHeight: 1.3,
          }}>{q.question}</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {q.options.map((opt, i) => {
              const isSelected = selected === i;
              return (
                <button key={i} onClick={() => setSelected(i)} style={{
                  padding: "16px 20px", borderRadius: 12, border: `1.5px solid`,
                  borderColor: isSelected ? C.accent : C.border,
                  background: isSelected ? C.accentGlow : C.surface,
                  color: isSelected ? C.accent : C.text,
                  fontFamily: font.body, fontSize: 15, fontWeight: isSelected ? 600 : 400,
                  textAlign: "left", cursor: "pointer",
                  transition: "all 0.2s ease",
                  transform: isSelected ? "scale(1.02)" : "scale(1)",
                }}>
                  <span style={{
                    display: "inline-block", width: 22, height: 22, borderRadius: 6,
                    border: `2px solid ${isSelected ? C.accent : C.border}`,
                    background: isSelected ? C.accent : "transparent",
                    marginRight: 14, verticalAlign: "middle", textAlign: "center",
                    lineHeight: "18px", fontSize: 12, color: C.bg,
                  }}>{isSelected ? "✓" : ""}</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40 }}>
            <button className="btn-secondary" style={{
              padding: "12px 24px", fontSize: 14,
              opacity: current === 0 ? 0.3 : 1, pointerEvents: current === 0 ? "none" : "auto",
            }} onClick={handleBack}>← Back</button>
            <button className="btn-primary" style={{
              padding: "12px 32px", fontSize: 14,
              opacity: selected === null ? 0.4 : 1,
              pointerEvents: selected === null ? "none" : "auto",
            }} onClick={handleNext}>
              {current === questions.length - 1 ? "Find matches ✨" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ───
function DashboardPage({ user, setPage }) {
  const [revealed, setRevealed] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ minHeight: "100vh", paddingTop: 80, padding: "100px 24px 60px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div className="anim-fade-up" style={{ marginBottom: 48 }}>
          <span style={{
            display: "inline-block", padding: "6px 14px", borderRadius: 100,
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
            color: C.green, fontSize: 13, fontWeight: 600, marginBottom: 16,
          }}>✓ Questionnaire complete</span>
          <h1 style={{
            fontFamily: font.display, fontSize: 36, fontWeight: 700,
            letterSpacing: "-0.02em", marginBottom: 8,
          }}>
            Your matches, <span style={{ color: C.accent }}>{user?.name?.split(" ")[0] || "there"}</span>
          </h1>
          <p style={{ color: C.textMuted, fontSize: 16 }}>
            Based on your lifestyle preferences, here are your most compatible roommates.
          </p>
        </div>

        {/* Matches */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mockMatches.map((match, i) => {
            const isExpanded = expandedMatch === i;
            return (
              <div key={i} style={{
                background: C.surface, border: `1.5px solid ${isExpanded ? C.accent : C.border}`,
                borderRadius: 16, overflow: "hidden",
                transition: "all 0.3s ease",
                opacity: revealed ? 1 : 0,
                transform: revealed ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${0.1 + i * 0.12}s`,
                animation: revealed ? `matchReveal 0.6s ease-out ${0.2 + i * 0.12}s both` : "none",
              }}>
                <div style={{
                  padding: "20px 24px", display: "flex", alignItems: "center", gap: 16,
                  cursor: "pointer",
                }} onClick={() => setExpandedMatch(isExpanded ? null : i)}>
                  {/* Avatar */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: `linear-gradient(135deg, ${C.accent}, ${C.mcgill})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: font.display, fontSize: 18, fontWeight: 700, color: "white",
                    flexShrink: 0,
                  }}>{match.avatar}</div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2 }}>{match.name}</div>
                    <div style={{ fontSize: 13, color: C.textMuted }}>{match.program}</div>
                  </div>

                  {/* Compatibility */}
                  <div style={{
                    textAlign: "center", flexShrink: 0,
                    animation: revealed ? `compatPulse 0.5s ease ${0.8 + i * 0.12}s` : "none",
                  }}>
                    <div style={{
                      fontFamily: font.display, fontSize: 28, fontWeight: 900,
                      color: match.compat >= 90 ? C.green : match.compat >= 80 ? C.accent : C.textMuted,
                      lineHeight: 1,
                    }}>{match.compat}%</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>match</div>
                  </div>

                  <div style={{
                    fontSize: 18, color: C.textDim, transition: "transform 0.2s ease",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}>▾</div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="anim-fade-in" style={{
                    padding: "0 24px 24px", borderTop: `1px solid ${C.border}`,
                    paddingTop: 20,
                  }}>
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20,
                    }}>
                      {[
                        { label: "Sleep", value: match.sleep },
                        { label: "Cleanliness", value: match.clean },
                        { label: "Area", value: match.area },
                        { label: "Budget", value: match.budget },
                      ].map((d, j) => (
                        <div key={j} style={{
                          background: C.surfaceLight, borderRadius: 10, padding: "12px 16px",
                        }}>
                          <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{d.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{d.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button className="btn-primary" style={{ flex: 1, padding: "12px", fontSize: 14 }}>
                        Send intro email 📧
                      </button>
                      <button className="btn-secondary" style={{ padding: "12px 20px", fontSize: 14 }}>
                        Not interested
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Retake */}
        <div style={{ textAlign: "center", marginTop: 48 }}>
          <button className="btn-secondary" style={{ padding: "12px 28px", fontSize: 14 }}
            onClick={() => setPage("questionnaire")}>
            Retake questionnaire ↻
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App ───
export default function App() {
  const [page, setPage] = useState("landing");
  const [user, setUser] = useState(null);

  const handleAuth = (userData) => {
    setUser(userData);
    setPage("questionnaire");
  };

  const handleQuestionnaireComplete = (answers) => {
    setPage("dashboard");
  };

  const isLoggedIn = !!user;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: font.body }}>
      <style>{globalStyles}</style>
      <NavBar page={page} setPage={(p) => {
        if (p === "landing") setUser(null);
        setPage(p);
      }} isLoggedIn={isLoggedIn} />

      {page === "landing" && <LandingPage setPage={setPage} />}
      {page === "signup" && <AuthPage mode="signup" setPage={setPage} onAuth={handleAuth} />}
      {page === "login" && <AuthPage mode="login" setPage={setPage} onAuth={handleAuth} />}
      {page === "questionnaire" && <QuestionnairePage setPage={setPage} onComplete={handleQuestionnaireComplete} />}
      {page === "dashboard" && <DashboardPage user={user} setPage={setPage} />}
    </div>
  );
}
