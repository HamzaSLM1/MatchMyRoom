import { createContext, useContext, useState, useEffect } from "react";

// ─── Fonts ──────────────────────────────────────────────────────────────────
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap";

export const font = {
  display: "'Space Grotesk', sans-serif",
  body: "'Plus Jakarta Sans', sans-serif",
};

// ─── C — CSS custom property references (reactive across themes) ─────────────
// Components use these as inline style values: e.g. style={{ background: C.bg }}
// The actual values are set by data-theme / data-university attributes on <html>
export const C = {
  bg:          "var(--bg)",
  surface:     "var(--surface)",
  surfaceLight:"var(--surface-light)",
  border:      "var(--border)",
  text:        "var(--text)",
  textMuted:   "var(--text-muted)",
  textDim:     "var(--text-dim)",
  accent:      "var(--accent)",
  accentSoft:  "var(--accent-soft)",
  accentGlow:  "var(--accent-glow)",
  green:       "#10B981",
  secondary:   "#F59E0B",
  // Legacy aliases so old code doesn't break
  primary:     "var(--accent)",
  mcgillRed:   "#6366F1",
  concordiaMaroon: "#7C3AED",
  mcgillRedDark:   "#4F46E5",
};

// ─── ThemeContext ─────────────────────────────────────────────────────────────
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("mmr_theme");
    return saved !== null ? saved === "dark" : true; // default: dark
  });

  const [university, setUniversityState] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("mmr_user") || "{}");
      return user.university || "mcgill";
    } catch {
      return "mcgill";
    }
  });

  // Sync attributes to <html> element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    document.documentElement.setAttribute("data-university", university);
  }, [university]);

  // Apply on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-university", university);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("mmr_theme", next ? "dark" : "light");
      return next;
    });
  };

  const applyTheme = (univ) => {
    if (univ) setUniversityState(univ);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, applyTheme, university }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Legacy no-op — App.jsx now calls useTheme().applyTheme instead
export const applyTheme = () => {};

// ─── Global Styles ────────────────────────────────────────────────────────────
export const globalStyles = `
  @import url('${FONTS_URL}');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── CSS custom properties ── */
  :root {
    --accent:      #6366F1;
    --accent-soft: #A5B4FC;
    --accent-glow: rgba(99, 102, 241, 0.12);
    --green:       #10B981;
    --secondary:   #F59E0B;
    --error:       #EF4444;
    --error-bg:    rgba(239, 68, 68, 0.08);
    --error-border:rgba(239, 68, 68, 0.2);
    --success-bg:  rgba(16, 185, 129, 0.08);
    --success-border: rgba(16, 185, 129, 0.25);
  }

  [data-university="concordia"] {
    --accent:      #7C3AED;
    --accent-glow: rgba(124, 58, 237, 0.12);
  }

  [data-theme="dark"] {
    --bg:           #161A2E;
    --surface:      #1E2340;
    --surface-light:#252B4A;
    --border:       #2E3456;
    --text:         #F1F5F9;
    --text-muted:   #94A3B8;
    --text-dim:     #64748B;
    --nav-bg:       rgba(22, 26, 46, 0.92);
  }

  [data-theme="light"] {
    --bg:           #FAFAFA;
    --surface:      #FFFFFF;
    --surface-light:#F1F5F9;
    --border:       #E2E8F0;
    --text:         #1E293B;
    --text-muted:   #64748B;
    --text-dim:     #94A3B8;
    --nav-bg:       rgba(250, 250, 250, 0.92);
  }

  /* ── Base ── */
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Plus Jakarta Sans', sans-serif;
    overflow-x: hidden;
    transition: background 0.25s ease, color 0.25s ease;
  }
  ::selection { background: var(--accent); color: white; }
  input:focus, textarea:focus, select:focus { outline: none; }

  /* ── Animations (minimal) ── */
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeUp  { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes progressFill { from { width: 0%; } }
  @keyframes scrollDot {
    0%   { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(14px); opacity: 0; }
  }
  @keyframes confetti-fall {
    0%   { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }

  .anim-fade-up { animation: fadeUp 0.45s ease both; }
  .anim-fade-in { animation: fadeIn 0.35s ease both; }

  /* ── Buttons ── */
  .btn-primary {
    background: var(--accent);
    color: white;
    border: none;
    padding: 14px 32px;
    border-radius: 10px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .btn-primary:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-secondary {
    background: var(--surface);
    color: var(--text);
    border: 1.5px solid var(--border);
    padding: 14px 32px;
    border-radius: 10px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 500;
    font-size: 15px;
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
  }
  .btn-secondary:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); transform: translateY(-1px); }
  .btn-secondary:active { transform: translateY(0); }
  .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Inputs ── */
  .input-field {
    width: 100%;
    padding: 12px 16px;
    background: var(--surface-light);
    border: 1.5px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 15px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .input-field:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
    background: var(--surface);
  }
  .input-field::placeholder { color: var(--text-dim); }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 6px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-dim); }
`;
