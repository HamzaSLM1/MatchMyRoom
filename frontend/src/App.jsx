import { useState, useEffect, useRef, Component } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const FONTS_LINK = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,400&display=swap";

// ─── Error Boundary ───
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("MatchMyRoom Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#0C0A09", color: "#FAFAF9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏠</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h2>
            <p style={{ color: "#A8A29E", fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>The app encountered an error. Try clearing your session and refreshing.</p>
            <button onClick={() => { localStorage.removeItem("mmr_token"); localStorage.removeItem("mmr_user"); window.location.reload(); }} style={{ background: "linear-gradient(135deg, #ED1B2F, #F87171)", color: "white", border: "none", padding: "14px 32px", borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Clear Session & Reload</button>
            <div style={{ marginTop: 16, fontSize: 12, color: "#78716C", wordBreak: "break-all" }}>{this.state.error?.message}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Auth Helper ───
const authFetch = async (url, options = {}, token) => {
  const headers = { ...options.headers };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem("mmr_token");
    localStorage.removeItem("mmr_user");
    window.location.reload();
  }
  return response;
};

// ─── Theme ───
const C = {
  bg: "#0C0A09",
  surface: "#1C1917",
  surfaceLight: "#292524",
  border: "#3F3B37",
  text: "#FAFAF9",
  textMuted: "#A8A29E",
  textDim: "#78716C",
  mcgillRed: "#ED1B2F",
  mcgillRedDark: "#B91C1C",
  concordiaMaroon: "#912338",
  concordiaGold: "#FFD700",
  accent: "#ED1B2F",
  accentSoft: "#F87171",
  accentGlow: "rgba(237,27,47,0.15)",
  green: "#22C55E",
};

const font = { display: "'Fraunces', serif", body: "'DM Sans', sans-serif" };

const applyTheme = (university) => {
  if (university === "concordia") {
    C.accent = C.concordiaMaroon;
    C.accentSoft = C.concordiaGold;
    C.accentGlow = "rgba(145,35,56,0.15)";
  } else {
    C.accent = C.mcgillRed;
    C.accentSoft = "#F87171";
    C.accentGlow = "rgba(237,27,47,0.15)";
  }
};

const globalStyles = `
  @import url('${FONTS_LINK}');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; color: ${C.text}; font-family: ${font.body}; overflow-x: hidden; }
  ::selection { background: ${C.accent}; color: white; }
  input:focus, textarea:focus { outline: none; }

  /* Enhanced Keyframe Animations */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(32px); filter: blur(4px); }
    to { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes matchReveal {
    0% { opacity: 0; transform: scale(0.92) translateY(20px); filter: blur(2px); }
    60% { transform: scale(1.015) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
  }
  @keyframes compatPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.12); filter: brightness(1.2); }
  }
  @keyframes progressFill { from { width: 0%; } }
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px ${C.accentGlow}; }
    50% { box-shadow: 0 0 40px ${C.accentGlow}, 0 0 60px ${C.accentGlow}; }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  /* Utility Classes */
  .anim-fade-up { animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .anim-fade-in { animation: fadeIn 0.6s ease-out both; }
  .anim-float { animation: float 3s ease-in-out infinite; }
  .anim-shimmer {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
  }

  /* Enhanced Buttons */
  .btn-primary {
    background: linear-gradient(135deg, ${C.accent}, ${C.accentSoft});
    color: white;
    border: none;
    padding: 14px 32px;
    border-radius: 12px;
    font-family: ${font.body};
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 16px ${C.accentGlow};
  }
  .btn-primary:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 12px 32px ${C.accentGlow}, 0 0 0 1px rgba(255,255,255,0.1);
    filter: brightness(1.1);
  }
  .btn-primary:active {
    transform: translateY(-1px) scale(0.98);
  }

  .btn-secondary {
    background: ${C.surface};
    color: ${C.text};
    border: 1.5px solid ${C.border};
    padding: 14px 32px;
    border-radius: 12px;
    font-family: ${font.body};
    font-weight: 500;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }
  .btn-secondary:hover {
    border-color: ${C.accent};
    color: ${C.accent};
    transform: translateY(-2px);
    background: ${C.surfaceLight};
    box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  }
  .btn-secondary:active {
    transform: translateY(0);
  }

  /* Enhanced Input Fields */
  .input-field {
    width: 100%;
    padding: 14px 16px;
    background: ${C.surface};
    border: 1.5px solid ${C.border};
    border-radius: 10px;
    color: ${C.text};
    font-family: ${font.body};
    font-size: 15px;
    transition: all 0.3s ease;
  }
  .input-field:focus {
    border-color: ${C.accent};
    background: ${C.surfaceLight};
    box-shadow: 0 0 0 4px ${C.accentGlow}, 0 4px 12px rgba(0,0,0,0.2);
    transform: translateY(-1px);
  }
  .input-field::placeholder { color: ${C.textDim}; }

  /* Smooth Scrollbar */
  ::-webkit-scrollbar { width: 10px; }
  ::-webkit-scrollbar-track { background: ${C.surface}; }
  ::-webkit-scrollbar-thumb {
    background: ${C.border};
    border-radius: 10px;
    transition: background 0.2s;
  }
  ::-webkit-scrollbar-thumb:hover { background: ${C.textDim}; }
`;

const questions = [
  // University (FIRST)
  { id: "university", question: "Are you a McGill or Concordia student?", icon: "🏫", options: ["McGill", "Concordia"] },

  // Housing type
  { id: "livingLocation", question: "Where are you planning to live?", icon: "🏘️", options: ["University Residence", "Off-campus apartment/house"] },

  // McGill residences (McGill + Residence)
  { id: "mcgillResidence", question: "Which McGill residence?", icon: "🏠", options: ["Upper Rez (Gardner, McConnell, Molson)", "New Rez", "Solin Hall", "La Citadelle", "RVC", "Campus 1", "Carrefour Sherbrooke"], conditional: [{ dependsOn: "university", showIfValue: 0 }, { dependsOn: "livingLocation", showIfValue: 0 }] },

  // Concordia residences (Concordia + Residence)
  { id: "concordiaResidence", question: "Which Concordia residence?", icon: "🏠", options: ["Grey Nuns Residence", "Hingston Hall"], conditional: [{ dependsOn: "university", showIfValue: 1 }, { dependsOn: "livingLocation", showIfValue: 0 }] },

  // Year
  { id: "year", question: "What year are you in?", icon: "📆", options: ["U0", "U1", "U2", "U3", "U4", "Masters", "PhD", "Other"] },

  // Dealbreakers
  { id: "gender", question: "What is your gender?", icon: "👤", options: ["Male", "Female", "Non-binary", "Prefer not to say"] },
  { id: "genderPreference", question: "Preferred roommate gender?", icon: "🤝", options: ["Male", "Female", "Non-binary", "No preference"] },
  { id: "age", question: "What is your age?", icon: "🎂", options: ["18-20", "21-23", "24-26", "27+"] },
  { id: "program", question: "What are you studying?", icon: "🎓", options: ["Arts", "Science", "Engineering", "Commerce/Management", "Medicine", "Law", "Education", "Music", "Other"], allowCustom: true },

  // Budget (hidden if university residence)
  { id: "budget", question: "Monthly rent budget (your share)?", icon: "💰", options: ["$700–$1000", "$1000–$1300", "$1300–$1500", "$1500+", "Custom amount"], allowCustom: true, conditional: { dependsOn: "livingLocation", hideIfValue: 0 } },

  // Location (hidden if university residence)
  { id: "location", question: "Preferred area in Montréal?", icon: "📍", options: ["Milton-Parc / Ghetto", "Plateau Mont-Royal", "Downtown", "Côte-des-Neiges", "Mile End", "Flexible / no preference"], conditional: { dependsOn: "livingLocation", hideIfValue: 0 } },

  { id: "religion", question: "Religion or spiritual preference?", icon: "🕊️", options: ["No preference", "Christian", "Muslim", "Jewish", "Hindu", "Atheist/Agnostic", "Other"], allowCustom: true },

  // Lifestyle Compatibility
  { id: "sleepSchedule", question: "What's your typical sleep schedule?", icon: "🌙", options: ["Early bird (before 10pm)", "Night owl (after midnight)", "Somewhere in between", "Irregular / varies"] },
  { id: "cleanliness", question: "How would you describe your cleanliness?", icon: "✨", options: ["Spotless at all times", "Tidy, clean weekly", "Organized chaos", "I'll get to it eventually"] },
  { id: "noise", question: "Your ideal noise level at home?", icon: "🔊", options: ["Library silence", "Background music is fine", "I like it lively", "Depends on the day"] },
  { id: "guests", question: "How do you feel about having guests over?", icon: "🚪", options: ["Rarely / never", "Occasionally with notice", "Friends welcome anytime", "The more the merrier"] },
  { id: "study", question: "Where do you usually study?", icon: "📚", options: ["Always at home", "Libraries & cafés", "Mix of both", "I study on the go"] },
  { id: "dietary", question: "Any dietary considerations?", icon: "🍽️", options: ["None", "Vegetarian", "Vegan", "Halal/Kosher", "Allergies"] },
  { id: "workFromHome", question: "How often do you work from home?", icon: "💼", options: ["Never", "1-2 days/week", "3-4 days/week", "Always"] },
  { id: "language", question: "Preferred language at home?", icon: "🗣️", options: ["English", "French", "Bilingual", "No preference"] },
  { id: "moveIn", question: "When are you looking to move in?", icon: "📅", options: ["August", "January", "May", "ASAP / Flexible"] },
];

function Logo({ size = 28, university = "mcgill" }) {
  const gradientColors = university === "concordia" ? `${C.concordiaMaroon}, ${C.concordiaGold}` : `${C.mcgillRed}, ${C.mcgillRedDark}`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <div style={{ width: size + 6, height: size + 6, borderRadius: 12, background: `linear-gradient(135deg, ${gradientColors})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: `0 4px 16px ${C.accentGlow}`, overflow: "hidden" }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ position: "relative", zIndex: 1 }}>
          <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(255,255,255,0.15)"/>
          <path d="M9 22V12H15V22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="8" r="1.5" fill="white"/>
        </svg>
        <div style={{ position: "absolute", top: -10, right: -10, width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
      </div>
      <span style={{ fontFamily: font.display, fontSize: size * 0.75, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>Match<span style={{ color: C.accent }}>My</span>Room</span>
    </div>
  );
}

function NavBar({ page, setPage, isLoggedIn, user, unreadCount = 0 }) {
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "16px 32px", background: "rgba(12,10,9,0.92)", backdropFilter: "blur(24px) saturate(180%)", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
      <div onClick={() => setPage("landing")} style={{ transition: "transform 0.2s ease" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}><Logo university={user?.university} /></div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {isLoggedIn ? (
          <>
            <button className="btn-secondary" style={{ padding: "10px 20px", fontSize: 14 }} onClick={() => setPage("dashboard")}>Dashboard</button>
            <button className="btn-secondary" style={{ padding: "10px 20px", fontSize: 14, position: "relative" }} onClick={() => setPage("messages")}>
              Messages
              {unreadCount > 0 && <span style={{ position: "absolute", top: -8, right: -8, background: C.mcgillRed, color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{unreadCount}</span>}
            </button>
            <button className="btn-secondary" style={{ padding: "10px 20px", fontSize: 14 }} onClick={() => setPage("profile")}>Profile</button>
            <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 14 }} onClick={() => setPage("landing")}>Log out</button>
          </>
        ) : (
          <>
            <button className="btn-secondary" style={{ padding: "10px 20px", fontSize: 14 }} onClick={() => setPage("login")}>Log in</button>
            <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 14 }} onClick={() => setPage("signup")}>Sign up</button>
          </>
        )}
      </div>
    </nav>
  );
}

function LandingPage({ setPage }) {
  return (
    <div style={{ minHeight: "100vh", paddingTop: 80 }}>
      <section style={{ minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 24px", position: "relative", overflow: "hidden" }}>
        {/* Animated background gradients */}
        <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 800, height: 800, borderRadius: "50%", background: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 70%)`, pointerEvents: "none", animation: "glow 4s ease-in-out infinite" }} />
        <div className="anim-float" style={{ position: "absolute", top: "15%", right: "10%", width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${C.mcgillRedDark}40, transparent)`, pointerEvents: "none", animationDelay: "0.5s" }} />
        <div className="anim-float" style={{ position: "absolute", bottom: "20%", left: "8%", width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${C.concordiaMaroon}30, transparent)`, pointerEvents: "none", animationDelay: "1s" }} />

        <div className="anim-fade-up" style={{ animationDelay: "0.1s", zIndex: 1 }}>
          <span style={{ display: "inline-block", padding: "8px 20px", borderRadius: 100, background: C.accentGlow, border: `1px solid ${C.accent}40`, color: C.accent, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 32, boxShadow: `0 4px 16px ${C.accentGlow}` }}>
            🏠 Built for McGill & Concordia students
          </span>
        </div>
        <h1 className="anim-fade-up" style={{ fontFamily: font.display, fontSize: "clamp(42px, 7vw, 80px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", maxWidth: 800, marginBottom: 24, animationDelay: "0.2s" }}>
          Find your <span style={{ background: `linear-gradient(135deg, ${C.mcgillRed}, ${C.concordiaMaroon})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>perfect</span><br />roommate
        </h1>
        <p className="anim-fade-up" style={{ fontSize: 19, color: C.textMuted, maxWidth: 520, lineHeight: 1.7, marginBottom: 48, animationDelay: "0.35s" }}>
          Answer a quick questionnaire about your lifestyle, and we'll match you with compatible students at McGill or Concordia looking for roommates in Montréal.
        </p>
        <div className="anim-fade-up" style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", animationDelay: "0.5s" }}>
          <button className="btn-primary" style={{ padding: "16px 40px", fontSize: 16 }} onClick={() => setPage("signup")}>Get matched →</button>
          <button className="btn-secondary" style={{ padding: "16px 40px", fontSize: 16 }} onClick={() => setPage("login")}>I have an account</button>
        </div>
      </section>
      <footer style={{ padding: "32px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1000, margin: "0 auto", fontSize: 13, color: C.textDim }}>
        <Logo size={20} />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: C.accent, cursor: "pointer", textDecoration: "underline" }} onClick={() => setPage("tos")}>Terms of Service</span>
          <span>© 2025 MatchMyRoom · Built for McGill & Concordia students</span>
        </div>
      </footer>
    </div>
  );
}

function TermsOfServicePage({ setPage }) {
  return (
    <div style={{ minHeight: "100vh", paddingTop: 80, padding: "100px 24px 60px" }}>
      <div className="anim-fade-up" style={{ maxWidth: 760, margin: "0 auto", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "40px 40px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Logo size={24} />
          <h1 style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, marginTop: 24, letterSpacing: "-0.02em" }}>Terms of Service</h1>
          <p style={{ color: C.textMuted, fontSize: 14, marginTop: 8 }}>Last updated: April 2025</p>
        </div>

        <div style={{ fontSize: 15, lineHeight: 1.8, color: C.text }}>
          <div style={{ background: `${C.mcgillRed}15`, border: `1px solid ${C.mcgillRed}30`, borderRadius: 12, padding: "16px 20px", marginBottom: 28 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.mcgillRed, marginBottom: 6 }}>⚠️ Important Disclaimer</div>
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>MatchMyRoom is a <strong>roommate matching platform only</strong>. We are <strong>not a landlord, property manager, or real estate agent</strong>. We do not own, lease, or manage any housing. We are <strong>not liable</strong> for any disputes, damages, losses, or issues that arise between matched users, including but not limited to roommate conflicts, lease disagreements, financial disputes, or property damage.</div>
          </div>

          <h2 style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 28 }}>1. Acceptance of Terms</h2>
          <p style={{ marginBottom: 20, color: C.textMuted }}>By creating an account on MatchMyRoom, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our platform.</p>

          <h2 style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 28 }}>2. Platform Description</h2>
          <p style={{ marginBottom: 20, color: C.textMuted }}>MatchMyRoom is a free roommate matching service designed exclusively for McGill University and Concordia University students. Our platform uses a questionnaire-based compatibility algorithm to suggest potential roommate matches. We facilitate introductions only — all housing arrangements, lease agreements, and living decisions are made solely between users.</p>

          <h2 style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 28 }}>3. Eligibility</h2>
          <p style={{ marginBottom: 20, color: C.textMuted }}>You must be a current student at McGill University or Concordia University with a valid university email address (@mcgill.ca, @mail.mcgill.ca, @concordia.ca, or @live.concordia.ca) to create an account. You must be at least 18 years of age.</p>

          <h2 style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 28 }}>4. User Conduct</h2>
          <p style={{ marginBottom: 12, color: C.textMuted }}>You agree to:</p>
          <ul style={{ marginBottom: 20, paddingLeft: 24, color: C.textMuted }}>
            <li style={{ marginBottom: 8 }}>Provide accurate and truthful information in your profile and questionnaire</li>
            <li style={{ marginBottom: 8 }}>Treat other users with respect and courtesy in all communications</li>
            <li style={{ marginBottom: 8 }}>Not use the platform for harassment, discrimination, or any unlawful purpose</li>
            <li style={{ marginBottom: 8 }}>Not impersonate another person or misrepresent your identity</li>
            <li style={{ marginBottom: 8 }}>Not share other users' personal information without their consent</li>
          </ul>

          <h2 style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 28 }}>5. Limitation of Liability</h2>
          <p style={{ marginBottom: 20, color: C.textMuted }}>MatchMyRoom provides roommate suggestions based on self-reported preferences. We make <strong>no guarantees</strong> about the accuracy of user profiles, the quality of matches, or the outcome of any roommate arrangement. We are not responsible for verifying users' identities, backgrounds, or the accuracy of the information they provide. <strong>You use this platform and act on its suggestions entirely at your own risk.</strong></p>

          <h2 style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 28 }}>6. Privacy & Data</h2>
          <p style={{ marginBottom: 20, color: C.textMuted }}>Your questionnaire responses and profile information are used solely for generating roommate matches and improving the platform experience. We do not sell your personal data to third parties. Profile pictures are stored on Cloudinary's secure servers. You may delete your account and all associated data at any time.</p>

          <h2 style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 28 }}>7. Account Termination</h2>
          <p style={{ marginBottom: 20, color: C.textMuted }}>We reserve the right to suspend or terminate accounts that violate these Terms of Service, including but not limited to accounts that engage in harassment, post fraudulent content, or are reported by multiple users. You may delete your own account at any time through your profile settings.</p>

          <h2 style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 28 }}>8. Changes to Terms</h2>
          <p style={{ marginBottom: 20, color: C.textMuted }}>We may update these Terms of Service from time to time. Continued use of the platform after changes are posted constitutes acceptance of the revised terms. We will notify users of significant changes via email.</p>

          <h2 style={{ fontFamily: font.display, fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 28 }}>9. Contact</h2>
          <p style={{ marginBottom: 20, color: C.textMuted }}>If you have any questions about these Terms of Service, please reach out to the MatchMyRoom team through your university student channels.</p>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <button className="btn-secondary" style={{ flex: 1, padding: "14px" }} onClick={() => setPage("landing")}>← Back to Home</button>
          <button className="btn-primary" style={{ flex: 1, padding: "14px" }} onClick={() => setPage("signup")}>Sign Up</button>
        </div>
      </div>
    </div>
  );
}

function AuthPage({ mode, setPage, setPendingEmail, setDevCode, onAuth }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const isSignup = mode === "signup";

  const handleSubmit = async () => {
    setError("");
    if (isSignup && !name.trim()) return setError("Name is required");
    if (!email.includes("@")) return setError("Enter a valid email");
    if (isSignup && !(email.endsWith("@mcgill.ca") || email.endsWith("@mail.mcgill.ca") || email.endsWith("@concordia.ca") || email.endsWith("@live.concordia.ca"))) {
      return setError("Only McGill or Concordia emails are allowed");
    }
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (isSignup && !tosAccepted) return setError("You must accept the Terms of Service to create an account");

    setLoading(true);
    try {
      const endpoint = isSignup ? `${API_BASE}/signup` : `${API_BASE}/login`;
      const body = isSignup ? { name, email, password } : { email, password };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) {
        // If email not verified, redirect to verification page
        if (response.status === 403 && !isSignup) {
          setPendingEmail(email);
          setPage("verify");
          setLoading(false);
          return;
        }
        setError(data.detail || "An error occurred");
        setLoading(false);
        return;
      }

      applyTheme(data.university);
      setLoading(false);
      onAuth(data);
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
          {isSignup && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: C.surfaceLight, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <input type="checkbox" id="tos-checkbox" checked={tosAccepted} onChange={(e) => setTosAccepted(e.target.checked)} style={{ marginTop: 3, accentColor: C.accent, width: 18, height: 18, cursor: "pointer", flexShrink: 0 }} />
              <label htmlFor="tos-checkbox" style={{ fontSize: 13, color: C.textMuted, cursor: "pointer", lineHeight: 1.5 }}>
                I have read and agree to the <span style={{ color: C.accent, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }} onClick={(e) => { e.preventDefault(); setPage("tos"); }}>Terms of Service</span>. I understand that MatchMyRoom is a matching platform only and is not liable for roommate disputes.
              </label>
            </div>
          )}
          {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(237,27,47,0.1)", border: "1px solid rgba(237,27,47,0.2)", color: C.mcgillRed, fontSize: 14 }}>{error}</div>}
          <button className="btn-primary" style={{ width: "100%", padding: "15px", marginTop: 8, opacity: loading || (isSignup && !tosAccepted) ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>{loading ? "Please wait..." : isSignup ? "Create account" : "Log in"}</button>
        </div>
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: C.textMuted }}>
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <span style={{ color: C.accent, cursor: "pointer", fontWeight: 500 }} onClick={() => setPage(isSignup ? "login" : "signup")}>{isSignup ? "Log in" : "Sign up"}</span>
        </div>
      </div>
    </div>
  );
}

function VerificationPage({ email, setPage, devCode: initialDevCode, setDevCode }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [localDevCode, setLocalDevCode] = useState(initialDevCode || "");
  const shownDevCode = localDevCode || initialDevCode;

  const handleVerify = async () => {
    setError("");
    if (code.length !== 6) return setError("Please enter the 6-digit code");

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/verify-email`, {
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
      setTimeout(() => setPage("login"), 2000);
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/resend-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      
      if (response.ok) {
        setError("");
        if (data.dev_code) {
          setLocalDevCode(data.dev_code);
          if (setDevCode) setDevCode(data.dev_code);
        }
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
          <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
          <h2 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, marginTop: 24, letterSpacing: "-0.02em" }}>Check your email</h2>
          <p style={{ color: C.textMuted, fontSize: 14, marginTop: 8 }}>
            We sent a 6-digit verification code to<br />
            <strong style={{ color: C.accent }}>{email}</strong>
          </p>
          <p style={{ color: C.textMuted, fontSize: 13, marginTop: 12, padding: "10px 16px", background: C.surfaceLight, borderRadius: 8 }}>
            <strong style={{ color: C.text }}>📬 Check your junk/spam folder</strong> if you don't see it in your inbox
          </p>
          {shownDevCode && (
            <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 4 }}>🛠️ Dev mode — your code:</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.green, letterSpacing: "6px", fontFamily: "monospace" }}>{shownDevCode}</div>
            </div>
          )}
        </div>

        {success ? (
          <div style={{ padding: "20px", borderRadius: 12, background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ color: "#22C55E", fontWeight: 600 }}>Email verified!</div>
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
                <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(237,27,47,0.1)", border: "1px solid rgba(237,27,47,0.2)", color: C.mcgillRed, fontSize: 14 }}>
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
                onClick={() => setPage("login")}
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


function QuestionnairePage({ setPage, onComplete, user, token }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [customInput, setCustomInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter questions based on conditional logic (supports arrays of conditions and hideIfValue)
  const filterQuestions = (answersObj) => {
    return questions.filter(q => {
      if (!q.conditional) return true;
      const conditions = Array.isArray(q.conditional) ? q.conditional : [q.conditional];
      return conditions.every(cond => {
        const val = answersObj[cond.dependsOn];
        if (cond.showIfValue !== undefined) return val === cond.showIfValue;
        if (cond.hideIfValue !== undefined) return val !== cond.hideIfValue;
        return true;
      });
    });
  };
  const getVisibleQuestions = () => filterQuestions(answers);

  const visibleQuestions = getVisibleQuestions();
  const q = visibleQuestions[current];
  const progress = (current / visibleQuestions.length) * 100;

  const isLastOption = selected === q.options.length - 1;
  const needsCustomInput = q.allowCustom && isLastOption;

  const handleNext = async () => {
    if (selected === null) return;
    if (needsCustomInput && !customInput.trim()) return;

    const value = needsCustomInput ? customInput.trim() : selected;
    const updated = { ...answers, [q.id]: value };
    setAnswers(updated);
    setSelected(null);
    setCustomInput("");

    // After answering a question that other questions depend on, recalculate visible questions
    const newVisibleQuestions = filterQuestions(updated);

    if (current < newVisibleQuestions.length - 1) {
      setCurrent(current + 1);
    } else {
      setSubmitting(true);
      try {
        const response = await authFetch(`${API_BASE}/questionnaire/submit?user_id=${user.user_id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ responses: updated }) }, token);
        if (response.ok) {
          await authFetch(`${API_BASE}/matches/calculate?user_id=${user.user_id}`, { method: "POST" }, token);
          onComplete(updated);
        } else { alert("Error submitting questionnaire"); setSubmitting(false); }
      } catch (err) { alert("Network error"); setSubmitting(false); }
    }
  };

  const handleBack = () => {
    if (current > 0) {
      setCurrent(current - 1);
      const prevAnswer = answers[visibleQuestions[current - 1].id];
      if (typeof prevAnswer === "string") {
        setSelected(visibleQuestions[current - 1].options.length - 1);
        setCustomInput(prevAnswer);
      } else {
        setSelected(prevAnswer ?? null);
        setCustomInput("");
      }
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80, padding: "120px 24px 60px" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: C.textDim }}>Question {current + 1} of {visibleQuestions.length}</span>
            <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 4, background: C.surfaceLight, borderRadius: 100, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 100, background: `linear-gradient(90deg, ${C.accent}, ${C.accentSoft})`, width: `${progress}%`, transition: "width 0.5s ease", animation: "progressFill 0.5s ease-out" }} />
          </div>
        </div>
        <div key={current} className="anim-fade-up">
          <div style={{ fontSize: 48, marginBottom: 16 }}>{q.icon}</div>
          <h2 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, marginBottom: 32, letterSpacing: "-0.02em", lineHeight: 1.3 }}>{q.question}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {q.options.map((opt, i) => {
              const isSelected = selected === i;
              return (
                <button key={i} onClick={() => setSelected(i)} style={{ padding: "16px 20px", borderRadius: 12, border: `1.5px solid`, borderColor: isSelected ? C.accent : C.border, background: isSelected ? C.accentGlow : C.surface, color: isSelected ? C.accent : C.text, fontFamily: font.body, fontSize: 15, fontWeight: isSelected ? 600 : 400, textAlign: "left", cursor: "pointer", transition: "all 0.2s ease", transform: isSelected ? "scale(1.02)" : "scale(1)" }}>
                  <span style={{ display: "inline-block", width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? C.accent : C.border}`, background: isSelected ? C.accent : "transparent", marginRight: 14, verticalAlign: "middle", textAlign: "center", lineHeight: "18px", fontSize: 12, color: C.bg }}>{isSelected ? "✓" : ""}</span>
                  {opt}
                </button>
              );
            })}
            {needsCustomInput && (
              <input
                className="input-field"
                placeholder={q.id === "budget" ? "Enter your budget (e.g., $1600)" : q.id === "program" ? "Enter your program" : "Specify..."}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                autoFocus
                style={{ marginTop: 8 }}
              />
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40 }}>
            <button className="btn-secondary" style={{ padding: "12px 24px", fontSize: 14, opacity: current === 0 ? 0.3 : 1, pointerEvents: current === 0 ? "none" : "auto" }} onClick={handleBack}>← Back</button>
            <button className="btn-primary" style={{ padding: "12px 32px", fontSize: 14, opacity: selected === null || submitting ? 0.4 : 1, pointerEvents: selected === null || submitting ? "none" : "auto" }} onClick={handleNext}>
              {submitting ? "Submitting..." : current === visibleQuestions.length - 1 ? "Find matches ✨" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SwipeCard({ match, onSwipe, getInitials, isTop, user, token }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleStart = (clientX, clientY) => {
    setIsDragging(true);
    setStartPos({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMove = (clientX, clientY) => {
    if (!isDragging) return;
    const newX = clientX - startPos.x;
    const newY = clientY - startPos.y;
    setPosition({ x: newX, y: newY * 0.3 });
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 120;
    if (Math.abs(position.x) > threshold) {
      const direction = position.x > 0 ? "right" : "left";
      const exitX = direction === "right" ? 1000 : -1000;
      setPosition({ x: exitX, y: position.y });
      setTimeout(() => onSwipe(direction), 300);
    } else {
      setPosition({ x: 0, y: 0 });
    }
  };

  const rotation = position.x * 0.03;
  const opacity = Math.max(0, 1 - Math.abs(position.x) / 400);
  const swipeDirection = position.x > 30 ? "right" : position.x < -30 ? "left" : null;

  return (
    <div
      ref={cardRef}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      style={{
        position: "absolute",
        width: "100%",
        maxWidth: 400,
        cursor: isDragging ? "grabbing" : "grab",
        transform: `translateX(${position.x}px) translateY(${position.y}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: isTop ? 10 : 5,
        userSelect: "none",
        touchAction: "none"
      }}
    >
      <div style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        {/* Swipe indicators */}
        {swipeDirection === "right" && (
          <div style={{ position: "absolute", top: 40, right: 40, background: C.green, color: "white", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: 20, transform: "rotate(15deg)", zIndex: 20, opacity: Math.min(1, Math.abs(position.x) / 100) }}>
            ❤️ INTERESTED
          </div>
        )}
        {swipeDirection === "left" && (
          <div style={{ position: "absolute", top: 40, left: 40, background: C.textMuted, color: "white", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: 20, transform: "rotate(-15deg)", zIndex: 20, opacity: Math.min(1, Math.abs(position.x) / 100) }}>
            👋 PASS
          </div>
        )}

        {/* Profile picture or avatar */}
        <div style={{ height: 280, position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${C.accent}20, ${C.accentSoft}10)` }}>
          {match.profile_pic_url ? (
            <img src={match.profile_pic_url} alt={match.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})` }}>
              <div style={{ fontFamily: font.display, fontSize: 90, fontWeight: 900, color: "white", opacity: 0.9 }}>{getInitials(match.name)}</div>
            </div>
          )}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", padding: "60px 24px 24px" }}>
            <h2 style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: "white", marginBottom: 8 }}>{match.name}</h2>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.9)", marginBottom: 12 }}>{match.university === "concordia" ? "Concordia" : "McGill"} Student</div>
            <div style={{ display: "inline-block", background: match.compatibility_score >= 90 ? C.green : C.accent, color: "white", padding: "6px 14px", borderRadius: 100, fontWeight: 700, fontSize: 14 }}>
              {Math.round(match.compatibility_score)}% Match
            </div>
          </div>
        </div>

        {/* Match details */}
        <div style={{ padding: 24 }}>
          {match.bio && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>About</div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: C.text }}>{match.bio}</p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Sleep", value: match.sleep, icon: "😴" },
              { label: "Cleanliness", value: match.clean, icon: "✨" },
              { label: "Area", value: match.area, icon: "📍" },
              { label: "Budget", value: match.budget, icon: "💰" }
            ].filter(d => d.value).map((d, j) => (
              <div key={j} style={{ background: C.surfaceLight, borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  {d.icon} {d.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{d.value}</div>
              </div>
            ))}
          </div>
          <CompatibilityBreakdown userId={user.user_id} otherUserId={match.user_id} token={token} overallScore={match.compatibility_score} compact />
        </div>
      </div>
    </div>
  );
}

function SwipeInterface({ matches, user, setPage, setSelectedMatch, token, setViewMode }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedMatches, setSwipedMatches] = useState({ interested: [], passed: [] });
  const [messagePrompt, setMessagePrompt] = useState(null);
  const [promptMessage, setPromptMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [mutualMatchAlert, setMutualMatchAlert] = useState(null);

  const recordSwipe = async (match, isLike) => {
    try {
      const response = await authFetch(`${API_BASE}/swipes/like?user_id=${user.user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked_user_id: match.user_id, is_like: isLike })
      }, token);
      if (response.ok) {
        const data = await response.json();
        if (data.is_mutual_match) {
          setMutualMatchAlert(match.name);
          setTimeout(() => setMutualMatchAlert(null), 3000);
        }
      }
    } catch (err) {
      console.error("Error recording swipe:", err);
    }
  };

  const handleSwipe = async (direction) => {
    const currentMatch = matches[currentIndex];
    if (direction === "right") {
      setSwipedMatches(prev => ({ ...prev, interested: [...prev.interested, currentMatch] }));
      recordSwipe(currentMatch, true);
      setMessagePrompt(currentMatch);
    } else {
      setSwipedMatches(prev => ({ ...prev, passed: [...prev.passed, currentMatch] }));
      recordSwipe(currentMatch, false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleButtonSwipe = (direction) => {
    handleSwipe(direction);
  };

  const handleSendPromptMessage = async () => {
    if (!promptMessage.trim() || !messagePrompt) return;
    setSendingMessage(true);
    try {
      await authFetch(`${API_BASE}/messages/send?sender_id=${user.user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: messagePrompt.user_id, content: promptMessage })
      }, token);
    } catch (err) {
      console.error("Error sending message:", err);
    }
    setSendingMessage(false);
    setPromptMessage("");
    setMessagePrompt(null);
    setCurrentIndex(prev => prev + 1);
  };

  const handleSkipMessage = () => {
    setPromptMessage("");
    setMessagePrompt(null);
    setCurrentIndex(prev => prev + 1);
  };

  const getInitials = (name) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const remainingMatches = matches.slice(currentIndex);
  const hasMatches = remainingMatches.length > 0;

  return (
    <div style={{ minHeight: "calc(100vh - 160px)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40 }}>
      {/* Mutual match alert */}
      {mutualMatchAlert && (
        <div style={{ position: "fixed", top: 100, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: `linear-gradient(135deg, ${C.green}, #16A34A)`, color: "white", padding: "16px 32px", borderRadius: 16, fontSize: 16, fontWeight: 700, boxShadow: "0 8px 32px rgba(34,197,94,0.4)", animation: "fadeUp 0.5s ease-out" }}>
          It's a mutual match with {mutualMatchAlert}!
        </div>
      )}

      {/* Message prompt modal after right swipe */}
      {messagePrompt && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="anim-fade-up" style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: 24, maxWidth: 440, width: "100%", padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❤️</div>
            <h3 style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>You liked {messagePrompt.name}!</h3>
            <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 24 }}>Send them a message to start the conversation?</p>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              {messagePrompt.profile_pic_url ? (
                <img src={messagePrompt.profile_pic_url} alt={messagePrompt.name} style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 16, fontWeight: 700, color: "white" }}>
                  {getInitials(messagePrompt.name)}
                </div>
              )}
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{messagePrompt.name}</div>
                <div style={{ fontSize: 13, color: C.textMuted }}>{Math.round(messagePrompt.compatibility_score)}% match</div>
              </div>
            </div>

            <textarea
              className="input-field"
              placeholder={`Say hi to ${messagePrompt.name.split(" ")[0]}...`}
              value={promptMessage}
              onChange={(e) => setPromptMessage(e.target.value)}
              style={{ minHeight: 80, resize: "vertical", fontFamily: font.body, marginBottom: 16 }}
            />

            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-secondary" style={{ flex: 1, padding: "12px" }} onClick={handleSkipMessage}>
                Skip for now
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, padding: "12px", opacity: sendingMessage || !promptMessage.trim() ? 0.5 : 1 }}
                onClick={handleSendPromptMessage}
                disabled={sendingMessage || !promptMessage.trim()}
              >
                {sendingMessage ? "Sending..." : "Send message"}
              </button>
            </div>
          </div>
        </div>
      )}

      {hasMatches ? (
        <>
          <div style={{ textAlign: "center", marginBottom: 24, padding: "16px 24px", background: C.surfaceLight, borderRadius: 12, border: `1px solid ${C.border}`, maxWidth: 400 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>Swipe right if interested, left to pass</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>Or use the buttons below</div>
          </div>
          <div style={{ position: "relative", width: "100%", maxWidth: 400, height: 480, marginBottom: 32 }}>
            {remainingMatches.slice(0, 2).reverse().map((match, idx) => (
              <SwipeCard
                key={match.id}
                match={match}
                onSwipe={handleSwipe}
                getInitials={getInitials}
                isTop={idx === 1}
                user={user}
                token={token}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <button
              onClick={() => handleButtonSwipe("left")}
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: `2px solid ${C.border}`,
                background: C.surface,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.borderColor = C.textMuted;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.borderColor = C.border;
              }}
            >
              ✕
            </button>

            <button
              onClick={() => handleButtonSwipe("right")}
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: `2px solid ${C.green}`,
                background: C.green,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(34,197,94,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
            >
              ❤️
            </button>
          </div>

          <div style={{ marginTop: 24, fontSize: 14, color: C.textMuted }}>
            {remainingMatches.length} match{remainingMatches.length !== 1 ? "es" : ""} remaining
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 20px", maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
          <h2 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, marginBottom: 12 }}>You've seen all your matches!</h2>
          <p style={{ color: C.textMuted, fontSize: 16, marginBottom: 32 }}>
            Here's a summary of your swipe session
          </p>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <div style={{ background: `${C.green}15`, border: `1px solid ${C.green}40`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: C.green, marginBottom: 4 }}>{swipedMatches.interested.length}</div>
                <div style={{ fontSize: 14, color: C.textMuted }}>Interested</div>
              </div>
              <div style={{ background: C.surfaceLight, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: C.textMuted, marginBottom: 4 }}>{swipedMatches.passed.length}</div>
                <div style={{ fontSize: 14, color: C.textMuted }}>Passed</div>
              </div>
            </div>

            {swipedMatches.interested.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontWeight: 600 }}>You liked</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {swipedMatches.interested.map((match, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: C.surfaceLight, borderRadius: 10 }}>
                      {match.profile_pic_url ? (
                        <img src={match.profile_pic_url} alt={match.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 14, fontWeight: 700, color: "white" }}>
                          {getInitials(match.name)}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{match.name}</div>
                        <div style={{ fontSize: 13, color: C.textMuted }}>{Math.round(match.compatibility_score)}% match</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {swipedMatches.interested.length > 0 && (
              <button className="btn-primary" style={{ padding: "12px 24px" }} onClick={() => setPage("messages")}>
                View Conversations
              </button>
            )}
            <button className="btn-secondary" style={{ padding: "12px 24px" }} onClick={() => setViewMode("list")}>
              Back to List View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileCompletionMeter({ profileData, setPage }) {
  if (!profileData) return null;

  const hasBio = profileData.bio && profileData.bio.trim().length > 0;
  const hasProfilePic = !!profileData.profile_pic_url;
  const hasQuestionnaire = profileData.questionnaire_completed;

  const completionItems = [
    { key: "questionnaire", label: "Questionnaire", completed: hasQuestionnaire, icon: "📝" },
    { key: "bio", label: "Bio", completed: hasBio, icon: "✍️" },
    { key: "picture", label: "Profile Picture", completed: hasProfilePic, icon: "📸" }
  ];

  const completedCount = completionItems.filter(item => item.completed).length;
  const percentage = Math.round((completedCount / completionItems.length) * 100);
  const isComplete = percentage === 100;

  if (isComplete) return null;

  return (
    <div className="anim-fade-up" style={{ background: `linear-gradient(135deg, ${C.accent}15, ${C.accentSoft}10)`, border: `1.5px solid ${C.accent}30`, borderRadius: 16, padding: 20, marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Complete Your Profile</div>
          <div style={{ fontSize: 14, color: C.textMuted }}>Boost your match visibility by {100 - percentage}%</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 900, color: C.accent, lineHeight: 1 }}>{percentage}%</div>
          <div style={{ fontSize: 11, color: C.textDim }}>complete</div>
        </div>
      </div>

      <div style={{ background: C.surfaceLight, borderRadius: 100, height: 8, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(90deg, ${C.accent}, ${C.accentSoft})`, height: "100%", width: `${percentage}%`, transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)", borderRadius: 100 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {completionItems.map(item => (
          <div key={item.key} style={{ background: item.completed ? `${C.green}15` : C.surface, border: `1px solid ${item.completed ? C.green : C.border}`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: item.completed ? C.green : C.text }}>{item.label}</div>
            </div>
            {item.completed ? <span style={{ fontSize: 16, color: C.green }}>✓</span> : <span style={{ fontSize: 14, color: C.textDim }}>○</span>}
          </div>
        ))}
      </div>

      {!isComplete && (
        <button className="btn-primary" style={{ width: "100%", marginTop: 16, padding: "12px", fontSize: 14 }} onClick={() => setPage("profile")}>
          Complete Profile →
        </button>
      )}
    </div>
  );
}

// ─── Compatibility Breakdown ───
const getBarColor = (percentage) => {
  if (percentage >= 80) return { bar: C.green, bg: `${C.green}20` };
  if (percentage >= 40) return { bar: "#F59E0B", bg: "rgba(245,158,11,0.15)" };
  return { bar: C.mcgillRed, bg: `${C.mcgillRed}20` };
};

function CompatibilityBreakdown({ userId, otherUserId, token, overallScore, compact = false }) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const fetchBreakdown = async () => {
      try {
        const response = await authFetch(`${API_BASE}/matches/breakdown/${userId}/${otherUserId}`, {}, token);
        if (response.ok) {
          const data = await response.json();
          setBreakdown(data);
        }
      } catch (err) {
        console.error("Error fetching breakdown:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBreakdown();
  }, [userId, otherUserId, token]);

  useEffect(() => {
    if (breakdown) {
      const t = setTimeout(() => setAnimated(true), 100);
      return () => clearTimeout(t);
    }
  }, [breakdown]);

  if (loading) {
    return (
      <div style={{ marginBottom: compact ? 8 : 20 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ marginBottom: compact ? 6 : 12, height: compact ? 16 : 44, borderRadius: 8, background: C.surfaceLight, overflow: "hidden" }}>
            <div className="anim-shimmer" style={{ width: "100%", height: "100%" }} />
          </div>
        ))}
      </div>
    );
  }

  if (!breakdown) return null;

  if (compact) {
    return (
      <div style={{ marginTop: 12 }}>
        {breakdown.categories.map((cat, i) => {
          const colors = getBarColor(cat.percentage);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 12, width: 14 }}>{cat.icon}</span>
              <span style={{ fontSize: 11, color: C.textMuted, width: 52, whiteSpace: "nowrap", overflow: "hidden" }}>{cat.name}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: colors.bg, overflow: "hidden" }}>
                <div style={{ height: "100%", width: animated ? `${cat.percentage}%` : "0%", background: colors.bar, borderRadius: 3, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
              </div>
              <span style={{ fontSize: 11, color: C.textMuted, width: 30, textAlign: "right" }}>{cat.percentage}%</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Compatibility Breakdown</div>
        <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 700, color: (overallScore || breakdown.overall_score) >= 90 ? C.green : C.accent }}>
          {Math.round(overallScore || breakdown.overall_score)}% match
        </div>
      </div>

      {breakdown.categories.map((cat, i) => {
        const colors = getBarColor(cat.percentage);
        const statusEmoji = cat.status === "match" ? "✅" : cat.status === "close" ? "⚠️" : "❌";
        return (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 15 }}>{cat.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{cat.name}</span>
              <div style={{ flex: 2, height: 8, borderRadius: 4, background: colors.bg, overflow: "hidden", margin: "0 8px" }}>
                <div style={{ height: "100%", width: animated ? `${cat.percentage}%` : "0%", background: colors.bar, borderRadius: 4, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
              </div>
              <span style={{ fontSize: 13, color: C.textMuted, width: 36, textAlign: "right" }}>{cat.percentage}%</span>
              <span style={{ fontSize: 13 }}>{statusEmoji}</span>
            </div>

            {cat.subcategories ? (
              <div style={{ marginLeft: 23, marginTop: 4 }}>
                {cat.subcategories.map((sub, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontSize: 13 }}>
                    <span style={{ fontSize: 12 }}>{sub.icon}</span>
                    <span style={{ color: C.textMuted, width: 80 }}>{sub.name}</span>
                    <span style={{ fontSize: 12 }}>{sub.match ? "✅" : "❌"}</span>
                    <span style={{ color: C.textDim }}>{sub.your_value}</span>
                    {!sub.match && <><span style={{ color: C.textDim }}>≠</span><span style={{ color: C.textDim }}>{sub.their_value}</span></>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginLeft: 23, fontSize: 13, color: C.textMuted }}>
                You: {cat.your_value} &nbsp;•&nbsp; Them: {cat.their_value}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DashboardPage({ user, setPage, setSelectedMatch, token }) {
  const [revealed, setRevealed] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [viewMode, setViewMode] = useState("swipe");

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await authFetch(`${API_BASE}/matches/${user.user_id}`, {}, token);
        if (response.ok) { const data = await response.json(); setMatches(data); }
      } catch (err) { console.error("Error fetching matches:", err); } finally { setLoading(false); }
    };
    const fetchProfile = async () => {
      try {
        const response = await authFetch(`${API_BASE}/profile/${user.user_id}`, {}, token);
        if (response.ok) { const data = await response.json(); setProfileData(data); }
      } catch (err) { console.error("Error fetching profile:", err); }
    };
    fetchMatches();
    fetchProfile();
    const t = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(t);
  }, [user.user_id, token]);

  const getInitials = (name) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  // Decorative polaroid-style university photo frames
  const photoFrames = [
    { image: "/images/mcgill-university-1-logo.png", label: "McGill Campus", rotation: -12, top: 120, left: 120, size: [190, 150] },
    { image: "/images/Arts-campus-fall-scaled.jpg", label: "Arts Building", rotation: 7, top: 340, left: 140, size: [180, 140] },
    { image: "/images/main-redpath-oct2024_0.jpg", label: "McGill", rotation: -4, top: 560, left: 110, size: [170, 150] },
    { image: "/images/667dd422ff53d8e3758e35c8_5279916243_96267b8e32_b.jpeg", label: "Concordia", rotation: 9, top: 140, right: 130, size: [190, 150] },
    { image: "/images/mcgill-crest.png", label: "EV Building", rotation: -6, top: 370, right: 120, size: [180, 140] },
    { image: "/images/Arts-campus-fall-scaled.jpg", label: "Montreal", rotation: 5, top: 580, right: 140, size: [170, 135] },
  ];

  return (
    <div style={{ minHeight: "100vh", paddingTop: 80, padding: "100px 24px 60px", position: "relative", overflow: "hidden" }}>
      {/* Decorative university photo frames — scattered like taped polaroids */}
      {matches.length > 0 && (
        <div style={{ position: "fixed", top: 80, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
          {photoFrames.map((frame, i) => (
            <div key={i} style={{
              position: "absolute",
              top: frame.top,
              left: frame.left,
              right: frame.right,
              width: frame.size[0],
              transform: `rotate(${frame.rotation}deg)`,
              background: "#f5f5f0",
              borderRadius: 4,
              padding: "8px 8px 28px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.2)",
              opacity: 0.7,
              transition: "opacity 0.3s",
            }}>
              <img src={frame.image} alt={frame.label} style={{
                width: "100%",
                height: frame.size[1],
                objectFit: "cover",
                borderRadius: 2,
                display: "block",
              }} />
              <div style={{
                textAlign: "center",
                marginTop: 8,
                fontFamily: "'Georgia', serif",
                fontSize: 10,
                color: "#555",
                fontStyle: "italic",
                letterSpacing: "0.02em",
              }}>{frame.label}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div className="anim-fade-up" style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ display: "inline-block", padding: "6px 14px", borderRadius: 100, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: C.green, fontSize: 13, fontWeight: 600 }}>✓ Questionnaire complete</span>
            {matches.length > 0 && (
              <div style={{ display: "flex", gap: 8, background: C.surfaceLight, padding: 4, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <button
                  onClick={() => setViewMode("list")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: viewMode === "list" ? C.accent : "transparent",
                    color: viewMode === "list" ? "white" : C.text,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  📋 List
                </button>
                <button
                  onClick={() => setViewMode("swipe")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: viewMode === "swipe" ? C.accent : "transparent",
                    color: viewMode === "swipe" ? "white" : C.text,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  💫 Swipe
                </button>
              </div>
            )}
          </div>
          <h1 style={{ fontFamily: font.display, fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>Your matches, <span style={{ color: C.accent }}>{user?.name?.split(" ")[0] || "there"}</span></h1>
          <p style={{ color: C.textMuted, fontSize: 16 }}>Based on your lifestyle preferences, here are your most compatible roommates.</p>
        </div>
        <ProfileCompletionMeter profileData={profileData} setPage={setPage} />

        {viewMode === "swipe" && !loading && matches.length > 0 ? (
          <SwipeInterface matches={matches} user={user} setPage={setPage} setSelectedMatch={setSelectedMatch} token={token} setViewMode={setViewMode} />
        ) : (
          <>
            {loading && <div style={{ textAlign: "center", padding: "60px 0" }}><div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div><div style={{ color: C.textMuted }}>Loading your matches...</div></div>}
            {!loading && matches.length === 0 && <div style={{ textAlign: "center", padding: "60px 0" }}><div style={{ fontSize: 48, marginBottom: 16 }}>😔</div><div style={{ color: C.textMuted, marginBottom: 8 }}>No matches found yet.</div><div style={{ color: C.textDim, fontSize: 14, marginBottom: 24 }}>You will be notified via email when a match is found for you.</div><button className="btn-secondary" onClick={() => setPage("questionnaire")}>Retake questionnaire</button></div>}
            {!loading && matches.length > 0 && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {matches.map((match, i) => {
                    const isExpanded = expandedMatch === i;
                    return (
                      <div key={i} style={{ background: C.surface, border: `1.5px solid ${isExpanded ? C.accent : C.border}`, borderRadius: 16, overflow: "hidden", transition: "all 0.3s ease", opacity: revealed ? 1 : 0, transform: revealed ? "translateY(0)" : "translateY(20px)", transitionDelay: `${0.1 + i * 0.12}s`, animation: revealed ? `matchReveal 0.6s ease-out ${0.2 + i * 0.12}s both` : "none" }}>
                        <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }} onClick={() => setExpandedMatch(isExpanded ? null : i)}>
                          {match.profile_pic_url ? <img src={match.profile_pic_url} alt={match.name} style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 18, fontWeight: 700, color: "white", flexShrink: 0 }}>{getInitials(match.name)}</div>}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2 }}>{match.name}</div>
                            <div style={{ fontSize: 13, color: C.textMuted }}>{match.university === "concordia" ? "Concordia" : "McGill"} Student</div>
                          </div>
                          <div style={{ textAlign: "center", flexShrink: 0, animation: revealed ? `compatPulse 0.5s ease ${0.8 + i * 0.12}s` : "none" }}>
                            <div style={{ fontFamily: font.display, fontSize: 28, fontWeight: 900, color: match.compatibility_score >= 90 ? C.green : match.compatibility_score >= 80 ? C.accent : C.textMuted, lineHeight: 1 }}>{Math.round(match.compatibility_score)}%</div>
                            <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>match</div>
                          </div>
                          <div style={{ fontSize: 18, color: C.textDim, transition: "transform 0.2s ease", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</div>
                        </div>
                        {isExpanded && (
                          <div className="anim-fade-in" style={{ padding: "0 24px 24px", borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                            {match.bio && <div style={{ background: C.surfaceLight, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}><div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>About</div><div style={{ fontSize: 14, lineHeight: 1.6 }}>{match.bio}</div></div>}
                            <CompatibilityBreakdown userId={user.user_id} otherUserId={match.user_id} token={token} overallScore={match.compatibility_score} />
                            <div style={{ display: "flex", gap: 12 }}><button className="btn-primary" style={{ flex: 1, padding: "12px", fontSize: 14 }} onClick={(e) => { e.stopPropagation(); setSelectedMatch(match); setPage("messages"); }}>Send message 💬</button></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ textAlign: "center", marginTop: 48 }}><button className="btn-secondary" style={{ padding: "12px 28px", fontSize: 14 }} onClick={() => setPage("questionnaire")}>Retake questionnaire ↻</button></div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProfileEditPage({ user, setPage, onProfileUpdate, token }) {
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authFetch(`${API_BASE}/profile/${user.user_id}`, {}, token);
        if (response.ok) { const data = await response.json(); setBio(data.bio || ""); if (data.profile_pic_url) setPreviewUrl(data.profile_pic_url); }
      } catch (err) { console.error("Error fetching profile:", err); }
    };
    fetchProfile();
  }, [user.user_id, token]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setProfilePicture(file); setPreviewUrl(URL.createObjectURL(file)); }
  };

  const handleSave = async () => {
    setLoading(true); setSuccess(false);
    try {
      if (bio !== undefined) await authFetch(`${API_BASE}/profile/update?user_id=${user.user_id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bio }) }, token);
      if (profilePicture) { const formData = new FormData(); formData.append("file", profilePicture); await authFetch(`${API_BASE}/profile/upload-picture?user_id=${user.user_id}`, { method: "POST", body: formData }, token); }
      setSuccess(true); onProfileUpdate(); setTimeout(() => setPage("dashboard"), 1500);
    } catch (err) { alert("Error saving profile"); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", paddingTop: 80, padding: "100px 24px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font.display, fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>Edit Profile</h1>
        <p style={{ color: C.textMuted, fontSize: 16, marginBottom: 48 }}>Add a profile picture and tell potential roommates about yourself.</p>
        <div style={{ marginBottom: 32 }}>
          <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 12, display: "block" }}>Profile Picture</label>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {previewUrl ? <img src={previewUrl} alt="Profile" style={{ width: 100, height: 100, borderRadius: 16, objectFit: "cover", border: `2px solid ${C.border}` }} /> : <div style={{ width: 100, height: 100, borderRadius: 16, background: C.surface, border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📷</div>}
            <div>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} id="profile-picture-input" />
              <label htmlFor="profile-picture-input" className="btn-secondary" style={{ padding: "10px 20px", fontSize: 14, cursor: "pointer", display: "inline-block" }}>Choose Image</label>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>JPG, PNG or WebP. Max 5MB.</div>
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 32 }}>
          <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 12, display: "block" }}>Bio ({bio.length}/500)</label>
          <textarea className="input-field" placeholder="Tell potential roommates about yourself, your interests, lifestyle..." value={bio} onChange={(e) => setBio(e.target.value.slice(0, 500))} style={{ minHeight: 150, resize: "vertical", fontFamily: font.body }} />
        </div>
        {success && <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: C.green, fontSize: 14 }}>✓ Profile updated successfully!</div>}
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-secondary" style={{ flex: 1, padding: "15px" }} onClick={() => setPage("dashboard")}>Cancel</button>
          <button className="btn-primary" style={{ flex: 1, padding: "15px", opacity: loading ? 0.7 : 1 }} onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Profile"}</button>
        </div>
      </div>
    </div>
  );
}

function MessagesPage({ user, selectedMatch, setPage, token }) {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(selectedMatch);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalData, setProfileModalData] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { if (selectedMatch) { setSelectedUser(selectedMatch); fetchThread(selectedMatch.user_id); } }, [selectedMatch]);
  useEffect(() => { fetchConversations(); const interval = setInterval(fetchConversations, 5000); return () => clearInterval(interval); }, [user.user_id]);
  useEffect(() => { if (selectedUser) { const interval = setInterval(() => fetchThread(selectedUser.user_id), 3000); return () => clearInterval(interval); } }, [selectedUser]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchConversations = async () => {
    try { const response = await authFetch(`${API_BASE}/messages/conversations/${user.user_id}`, {}, token); if (response.ok) { const data = await response.json(); setConversations(data); } } catch (err) { console.error("Error fetching conversations:", err); }
  };

  const fetchThread = async (otherUserId) => {
    try { const response = await authFetch(`${API_BASE}/messages/thread/${user.user_id}/${otherUserId}`, {}, token); if (response.ok) { const data = await response.json(); setMessages(data); } } catch (err) { console.error("Error fetching thread:", err); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    setLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/messages/send?sender_id=${user.user_id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient_id: selectedUser.user_id, content: newMessage }) }, token);
      if (response.ok) { setNewMessage(""); fetchThread(selectedUser.user_id); fetchConversations(); }
    } catch (err) { console.error("Error sending message:", err); } finally { setLoading(false); }
  };

  const getInitials = (name) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const handleViewProfile = async (targetUser) => {
    try {
      const response = await authFetch(`${API_BASE}/profile/${targetUser.user_id}`, {}, token);
      if (response.ok) {
        const profileData = await response.json();
        setProfileModalData({ ...targetUser, ...profileData });
        setShowProfileModal(true);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  return (
    <div style={{ minHeight: "100vh", paddingTop: 80, padding: "80px 0 0" }}>
      {showProfileModal && profileModalData && (
        <div onClick={() => setShowProfileModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: 24, maxWidth: 500, width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setShowProfileModal(false)} style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: "50%", border: `1px solid ${C.border}`, background: C.surfaceLight, color: C.text, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>×</button>

            <div style={{ height: 200, position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${C.accent}20, ${C.accentSoft}10)`, borderRadius: "24px 24px 0 0" }}>
              {profileModalData.profile_pic_url ? (
                <img src={profileModalData.profile_pic_url} alt={profileModalData.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})` }}>
                  <div style={{ fontFamily: font.display, fontSize: 80, fontWeight: 900, color: "white", opacity: 0.9 }}>{getInitials(profileModalData.name)}</div>
                </div>
              )}
            </div>

            <div style={{ padding: 24 }}>
              <h2 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{profileModalData.name}</h2>
              <div style={{ fontSize: 15, color: C.textMuted, marginBottom: 16 }}>{profileModalData.university === "concordia" ? "Concordia" : "McGill"} Student</div>

              {profileModalData.compatibility_score && (
                <div style={{ display: "inline-block", background: profileModalData.compatibility_score >= 90 ? C.green : C.accent, color: "white", padding: "8px 16px", borderRadius: 100, fontWeight: 700, fontSize: 15, marginBottom: 20 }}>
                  {Math.round(profileModalData.compatibility_score)}% Match
                </div>
              )}

              {profileModalData.bio && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 600 }}>About</div>
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: C.text, background: C.surfaceLight, padding: 16, borderRadius: 12 }}>{profileModalData.bio}</p>
                </div>
              )}

              <CompatibilityBreakdown userId={user.user_id} otherUserId={profileModalData.id || profileModalData.user_id} token={token} overallScore={profileModalData.compatibility_score} />

              <button className="btn-secondary" style={{ width: "100%", padding: "14px", fontSize: 15 }} onClick={() => setShowProfileModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", height: "calc(100vh - 80px)", display: "flex" }}>
        <div style={{ width: 320, borderRight: `1px solid ${C.border}`, overflowY: "auto", background: C.surface }}>
          <div style={{ padding: "24px 20px", borderBottom: `1px solid ${C.border}` }}><h2 style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700 }}>Messages</h2></div>
          {conversations.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}><div style={{ fontSize: 48, marginBottom: 16 }}>💬</div><div>No conversations yet</div><button className="btn-secondary" style={{ marginTop: 16, padding: "10px 20px", fontSize: 14 }} onClick={() => setPage("dashboard")}>Find matches</button></div> : conversations.map((conv, i) => (
            <div key={i} onClick={() => { setSelectedUser(conv); fetchThread(conv.user_id); }} style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: selectedUser?.user_id === conv.user_id ? C.surfaceLight : "transparent", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = C.surfaceLight} onMouseLeave={e => e.currentTarget.style.background = selectedUser?.user_id === conv.user_id ? C.surfaceLight : "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {conv.profile_pic_url ? <img src={conv.profile_pic_url} alt={conv.name} style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover" }} /> : <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 16, fontWeight: 700, color: "white" }}>{getInitials(conv.name)}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{conv.name}</div>
                  <div style={{ fontSize: 13, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.last_message}</div>
                </div>
                {conv.unread_count > 0 && <div style={{ background: C.mcgillRed, color: "white", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{conv.unread_count}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
          {selectedUser ? (
            <>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, background: C.surface, display: "flex", alignItems: "center", gap: 12 }}>
                <div onClick={() => handleViewProfile(selectedUser)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "opacity 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
                  {selectedUser.profile_pic_url ? <img src={selectedUser.profile_pic_url} alt={selectedUser.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} /> : <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 14, fontWeight: 700, color: "white" }}>{getInitials(selectedUser.name)}</div>}
                  <div><div style={{ fontWeight: 600, fontSize: 16 }}>{selectedUser.name}</div><div style={{ fontSize: 13, color: C.textMuted }}>{selectedUser.university === "concordia" ? "Concordia" : "McGill"} Student</div></div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.user_id;
                  return <div key={i} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}><div style={{ maxWidth: "70%", padding: "12px 16px", borderRadius: 12, background: isMe ? C.accent : C.surface, color: isMe ? "white" : C.text }}><div style={{ fontSize: 15, lineHeight: 1.5 }}>{msg.content}</div><div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div></div>;
                })}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ padding: "20px 24px", borderTop: `1px solid ${C.border}`, background: C.surface, display: "flex", gap: 12 }}>
                <input className="input-field" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()} style={{ flex: 1 }} />
                <button className="btn-primary" onClick={sendMessage} disabled={loading || !newMessage.trim()} style={{ padding: "14px 24px", opacity: loading || !newMessage.trim() ? 0.5 : 1 }}>Send</button>
              </div>
            </>
          ) : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: C.textMuted }}><div style={{ fontSize: 64, marginBottom: 16 }}>💬</div><div style={{ fontSize: 18 }}>Select a conversation to start messaging</div></div>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("landing");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingEmail, setPendingEmail] = useState("");
  const [devCode, setDevCode] = useState("");

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("mmr_token");
    const savedUser = localStorage.getItem("mmr_user");
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(userData);
        applyTheme(userData.university);
        setPage(userData.questionnaire_completed ? "dashboard" : "questionnaire");
      } catch {
        localStorage.removeItem("mmr_token");
        localStorage.removeItem("mmr_user");
      }
    }
  }, []);

  useEffect(() => {
    if (user && token) {
      applyTheme(user.university);
      const fetchUnread = async () => {
        try { const response = await authFetch(`${API_BASE}/messages/conversations/${user.user_id}`, {}, token); if (response.ok) { const data = await response.json(); const total = data.reduce((sum, conv) => sum + conv.unread_count, 0); setUnreadCount(total); } } catch (err) { console.error("Error fetching unread count:", err); }
      };
      fetchUnread();
      const interval = setInterval(fetchUnread, 10000);
      return () => clearInterval(interval);
    }
  }, [user, token]);

  const handleAuth = (userData) => {
    const authToken = userData.token;
    setToken(authToken);
    setUser(userData);
    localStorage.setItem("mmr_token", authToken);
    localStorage.setItem("mmr_user", JSON.stringify(userData));
    setPage(userData.questionnaire_completed ? "dashboard" : "questionnaire");
  };
  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("mmr_token");
    localStorage.removeItem("mmr_user");
    setPage("landing");
  };
  const handleQuestionnaireComplete = () => setPage("dashboard");
  const handleProfileUpdate = () => {};
  const isLoggedIn = !!user;

  return (
    <ErrorBoundary>
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: font.body }}>
      <style>{globalStyles}</style>
      <NavBar page={page} setPage={(p) => { if (p === "landing") handleLogout(); else setPage(p); }} isLoggedIn={isLoggedIn} user={user} unreadCount={unreadCount} />
      {page === "landing" && <LandingPage setPage={setPage} />}
      {page === "tos" && <TermsOfServicePage setPage={setPage} />}
      {page === "signup" && <AuthPage mode="signup" setPage={setPage} setPendingEmail={setPendingEmail} setDevCode={setDevCode} onAuth={handleAuth} />}
      {page === "login" && <AuthPage mode="login" setPage={setPage} setPendingEmail={setPendingEmail} setDevCode={setDevCode} onAuth={handleAuth} />}
      {page === "verify" && <VerificationPage email={pendingEmail} setPage={setPage} devCode={devCode} setDevCode={setDevCode} />}
      {page === "questionnaire" && <QuestionnairePage setPage={setPage} onComplete={handleQuestionnaireComplete} user={user} token={token} />}
      {page === "dashboard" && <DashboardPage user={user} setPage={setPage} setSelectedMatch={setSelectedMatch} token={token} />}
      {page === "profile" && <ProfileEditPage user={user} setPage={setPage} onProfileUpdate={handleProfileUpdate} token={token} />}
      {page === "messages" && <MessagesPage user={user} selectedMatch={selectedMatch} setPage={setPage} token={token} />}
    </div>
    </ErrorBoundary>
  );
}
