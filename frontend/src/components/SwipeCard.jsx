import { useState, useRef } from "react";
import { C, font } from "../theme/colors";
import {
  Heart, X, GraduationCap, User, MapPin, DollarSign,
  BedDouble, Users, Calendar, Home, Search
} from "lucide-react";

const iconStyle = { display: "inline", verticalAlign: "middle", marginRight: 4 };

function FieldIcon({ icon }) {
  switch (icon) {
    case "🎓": return <GraduationCap size={13} style={iconStyle} />;
    case "👤": return <User size={13} style={iconStyle} />;
    case "📍": return <MapPin size={13} style={iconStyle} />;
    case "💰": return <DollarSign size={13} style={iconStyle} />;
    case "🛏️": return <BedDouble size={13} style={iconStyle} />;
    case "👥": return <Users size={13} style={iconStyle} />;
    case "📅": return <Calendar size={13} style={iconStyle} />;
    default: return null;
  }
}

export default function SwipeCard({ match, onSwipe, getInitials, isTop, onViewProfile }) {
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
  const swipeDirection = position.x > 30 ? "right" : position.x < -30 ? "left" : null;

  return (
    <div
      ref={cardRef}
      onMouseDown={(e) => { e.preventDefault(); handleStart(e.clientX, e.clientY); }}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      style={{
        position: "absolute",
        width: "100%",
        maxWidth: 480,
        cursor: isDragging ? "grabbing" : "grab",
        transform: `translateX(${position.x}px) translateY(${position.y}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: isTop ? 10 : 5,
        userSelect: "none",
        touchAction: "none"
      }}
    >
      <div style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: 24, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        {/* Swipe indicators */}
        {swipeDirection === "right" && (
          <div style={{ position: "absolute", top: 40, right: 40, background: C.green, color: "white", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: 20, transform: "rotate(15deg)", zIndex: 20, opacity: Math.min(1, Math.abs(position.x) / 100), display: "flex", alignItems: "center", gap: 8 }}>
            <Heart size={18} fill="white" color="white" style={{ display: "inline", verticalAlign: "middle" }} /> INTERESTED
          </div>
        )}
        {swipeDirection === "left" && (
          <div style={{ position: "absolute", top: 40, left: 40, background: C.textMuted, color: "white", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: 20, transform: "rotate(-15deg)", zIndex: 20, opacity: Math.min(1, Math.abs(position.x) / 100), display: "flex", alignItems: "center", gap: 8 }}>
            <X size={18} color="white" style={{ display: "inline", verticalAlign: "middle" }} /> PASS
          </div>
        )}

        {/* Profile picture or avatar */}
        <div style={{ height: 380, position: "relative", overflow: "hidden", background: "rgba(99,102,241,0.12)" }}>
          {match.profile_pic_url ? (
            <img src={match.profile_pic_url} alt={match.name} draggable="false" style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})` }}>
              <div style={{ fontFamily: font.display, fontSize: 90, fontWeight: 900, color: "white", opacity: 0.9 }}>{getInitials(match.name)}</div>
            </div>
          )}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)", padding: "48px 20px 16px" }}>
            <h2 style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, color: "white", marginBottom: 4 }}>{match.name}</h2>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>{match.university === "concordia" ? "Concordia" : "McGill"} Student</div>
            <div style={{ display: "inline-block", background: match.compatibility_score >= 90 ? C.green : C.accent, color: "white", padding: "4px 12px", borderRadius: 100, fontWeight: 700, fontSize: 12 }}>
              {Math.round(match.compatibility_score)}% Match
            </div>
          </div>
        </div>

        {/* Match details */}
        <div style={{ padding: 24 }}>
          {/* Has a Place / Looking badge */}
          {match.has_apartment != null && (
            <div style={{ marginBottom: 16 }}>
              {match.has_apartment ? (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.09)", border: "1px solid rgba(16,185,129,0.35)", borderRadius: 8, padding: "6px 12px" }}>
                  <Home size={14} style={{ display: "inline", verticalAlign: "middle" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Has a Place — Looking for Roommates</span>
                </div>
              ) : (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.accentGlow, border: "1px solid rgba(99,102,241,0.25)", borderRadius: 8, padding: "6px 12px" }}>
                  <Search size={14} style={{ display: "inline", verticalAlign: "middle" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>Looking for a Place</span>
                </div>
              )}
            </div>
          )}

          {match.bio && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>About</div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: C.text }}>{match.bio}</p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Program", value: match.program, icon: "🎓" },
              { label: "Gender", value: match.gender, icon: "👤" },
              { label: match.has_apartment ? "Apt. Area" : "Area", value: match.area, icon: "📍" },
              { label: match.has_apartment ? "Rent/person" : "Budget", value: match.budget, icon: "💰" },
              ...(match.has_apartment ? [
                { label: "Bedrooms", value: match.apartment_rooms, icon: "🛏️" },
                { label: "Spots open", value: match.spots_available, icon: "👥" },
                { label: "Available", value: match.apartment_available, icon: "📅" },
              ] : [])
            ].filter(d => d.value).map((d, j) => (
              <div key={j} style={{ background: C.surfaceLight, borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, display: "flex", alignItems: "center" }}>
                  <FieldIcon icon={d.icon} />{d.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{d.value}</div>
              </div>
            ))}
          </div>
          {onViewProfile && (
            <div style={{ padding: "0 24px 20px" }}>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onViewProfile(); }}
                style={{ width: "100%", padding: "11px", borderRadius: 12, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "0.02em", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
              >
                View Full Profile ↗
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
