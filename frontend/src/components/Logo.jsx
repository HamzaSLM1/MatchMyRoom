import { C, font } from "../theme/colors";

export default function Logo({ size = 28, university = "mcgill" }) {
  const gradientColors = university === "concordia" ? `#7C3AED, #6D28D9` : `var(--accent), #4F46E5`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <div style={{ width: size + 6, height: size + 6, borderRadius: 12, background: `linear-gradient(135deg, ${gradientColors})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ position: "relative", zIndex: 1 }}>
          <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(255,255,255,0.15)"/>
          <path d="M9 22V12H15V22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="8" r="1.5" fill="white"/>
        </svg>
        <div style={{ position: "absolute", top: -10, right: -10, width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
      </div>
      <span style={{ fontFamily: font.display, fontSize: size * 0.75, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Match<span style={{ color: "var(--accent)" }}>My</span>Room</span>
    </div>
  );
}
