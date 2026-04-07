import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, useTheme } from "../theme/colors";
import Logo from "./Logo";
import { Sun, Moon, MessageCircle, LayoutDashboard, User, LogOut } from "lucide-react";

export default function NavBar({ isLoggedIn, user, unreadCount = 0, onLogout }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [themeHover, setThemeHover] = useState(false);

  return (
    <nav className="nav-bar" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "16px 32px", background: "var(--nav-bg)", backdropFilter: "blur(24px) saturate(180%)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
      <div onClick={() => navigate(isLoggedIn ? "/dashboard" : "/")} style={{ cursor: "pointer" }}><Logo university={user?.university} /></div>
      <div className="nav-links" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {isLoggedIn ? (
          <>
            <button className="btn-secondary" style={{ padding: "9px 18px", fontSize: 14 }} onClick={() => navigate("/dashboard")}>Dashboard</button>
            <button className="btn-secondary" style={{ padding: "9px 18px", fontSize: 14 }} onClick={() => navigate("/swipes")}>My Swipes</button>
            <button className="btn-secondary" style={{ padding: "9px 18px", fontSize: 14, position: "relative" }} onClick={() => navigate("/messages")}>
              Messages
              {unreadCount > 0 && <span style={{ position: "absolute", top: -8, right: -8, background: "var(--accent)", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{unreadCount}</span>}
            </button>
            <button className="btn-secondary" style={{ padding: "9px 18px", fontSize: 14 }} onClick={() => navigate("/profile")}>Profile</button>
            <button
              onClick={toggleTheme}
              onMouseEnter={() => setThemeHover(true)}
              onMouseLeave={() => setThemeHover(false)}
              style={{ padding: "9px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", color: themeHover ? "var(--accent)" : "var(--text)", borderColor: themeHover ? "var(--accent)" : "var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn-primary" style={{ padding: "9px 18px", fontSize: 14 }} onClick={onLogout}>Log out</button>
          </>
        ) : (
          <>
            <button
              onClick={toggleTheme}
              onMouseEnter={() => setThemeHover(true)}
              onMouseLeave={() => setThemeHover(false)}
              style={{ padding: "9px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", color: themeHover ? "var(--accent)" : "var(--text)", borderColor: themeHover ? "var(--accent)" : "var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn-secondary" style={{ padding: "9px 18px", fontSize: 14 }} onClick={() => navigate("/login")}>Log in</button>
            <button className="btn-primary" style={{ padding: "9px 18px", fontSize: 14 }} onClick={() => navigate("/signup")}>Sign up</button>
          </>
        )}
      </div>
    </nav>
  );
}
