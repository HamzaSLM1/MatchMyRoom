import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C, font } from "../theme/colors";
import { authFetch } from "../utils/api";
import ProfileCompletionMeter from "../components/ProfileCompletionMeter";
import ProfileModal from "../components/ProfileModal";
import SwipeInterface from "./SwipeInterface";
import {
  List, Sparkles, Home, Search, Check, MessageCircle, ExternalLink,
  Loader, Frown, ChevronDown
} from "lucide-react";

export default function DashboardPage({ user, token }) {
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [profileMatch, setProfileMatch] = useState(null);



  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await authFetch(`/api/matches/${user.user_id}`, {}, token);
        if (response.ok) { const data = await response.json(); setMatches(data); }
      } catch (err) { console.error("Error fetching matches:", err); } finally { setLoading(false); }
    };
    const fetchProfile = async () => {
      try {
        const response = await authFetch(`/api/profile/${user.user_id}`, {}, token);
        if (response.ok) { const data = await response.json(); setProfileData(data); }
      } catch (err) { console.error("Error fetching profile:", err); }
    };
    fetchMatches();
    fetchProfile();
    const t = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(t);
  }, [user.user_id, token]);

  const getInitials = (name) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="dashboard-container" style={{ minHeight: "100vh", paddingTop: 80, padding: "100px 24px 60px", position: "relative", overflow: "hidden" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div className="anim-fade-up" style={{ marginBottom: 48 }}>
          <div className="dashboard-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 100, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981", fontSize: 13, fontWeight: 600 }}>
              <Check size={13} style={{ display: "inline", verticalAlign: "middle" }} /> Questionnaire complete
            </span>
            {matches.length > 0 && (
              <div style={{ display: "flex", gap: 8, background: C.surfaceLight, padding: 4, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <button
                  onClick={() => setViewMode("list")}
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: "none",
                    background: viewMode === "list" ? C.accent : "transparent",
                    color: viewMode === "list" ? "white" : C.text,
                    fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease",
                    display: "flex", alignItems: "center", gap: 6
                  }}
                >
                  <List size={15} style={{ display: "inline", verticalAlign: "middle" }} /> List
                </button>
                <button
                  onClick={() => setViewMode("swipe")}
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: "none",
                    background: viewMode === "swipe" ? C.accent : "transparent",
                    color: viewMode === "swipe" ? "white" : C.text,
                    fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease",
                    display: "flex", alignItems: "center", gap: 6
                  }}
                >
                  <Sparkles size={15} style={{ display: "inline", verticalAlign: "middle" }} /> Swipe
                </button>
              </div>
            )}
          </div>
          <h1 style={{ fontFamily: font.display, fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>Your matches, <span style={{ color: C.accent }}>{user?.name?.split(" ")[0] || "there"}</span></h1>
          <p style={{ color: C.textMuted, fontSize: 16 }}>Based on your lifestyle preferences, here are your most compatible roommates.</p>
        </div>
        <ProfileCompletionMeter profileData={profileData} />

        {viewMode === "swipe" && !loading && matches.length > 0 ? (
          <SwipeInterface matches={matches} user={user} token={token} />
        ) : (
          <>
            {loading && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}><Loader size={40} color="var(--text-muted)" /></div>
                <div style={{ color: C.textMuted }}>Loading your matches...</div>
              </div>
            )}
            {!loading && matches.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}><Frown size={40} color="var(--text-muted)" /></div>
                <div style={{ color: C.textMuted, marginBottom: 8 }}>No matches found yet.</div>
                <div style={{ color: C.textDim, fontSize: 14, marginBottom: 24 }}>You will be notified via email when a match is found for you.</div>
                <button className="btn-secondary" onClick={() => navigate("/questionnaire")}>Retake questionnaire</button>
              </div>
            )}
            {!loading && matches.length > 0 && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {matches.map((match, i) => {
                    const isExpanded = expandedMatch === i;
                    return (
                      <div key={i} style={{ background: C.surface, border: `1.5px solid ${isExpanded ? C.accent : C.border}`, borderRadius: 16, overflow: "hidden", transition: "all 0.3s ease", opacity: revealed ? 1 : 0, transform: revealed ? "translateY(0)" : "translateY(12px)", transitionDelay: `${0.1 + i * 0.12}s` }}>
                        <div className="match-card-header" style={{ padding: "24px 28px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }} onClick={() => setExpandedMatch(isExpanded ? null : i)}>
                          {match.profile_pic_url ? <img src={match.profile_pic_url} alt={match.name} style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 22, fontWeight: 700, color: "white", flexShrink: 0 }}>{getInitials(match.name)}</div>}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <span style={{ fontWeight: 600, fontSize: 18 }}>{match.name}</span>
                              {match.has_apartment && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: C.green, background: "rgba(16,185,129,0.07)", borderRadius: 6, padding: "2px 6px" }}>
                                  <Home size={12} /> Has Place
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 13, color: C.textMuted }}>{match.university === "concordia" ? "Concordia" : "McGill"} Student</div>
                          </div>
                          <div style={{ textAlign: "center", flexShrink: 0 }}>
                            <div style={{ fontFamily: font.display, fontSize: 34, fontWeight: 900, color: match.compatibility_score >= 90 ? C.green : match.compatibility_score >= 80 ? C.accent : C.textMuted, lineHeight: 1 }}>{Math.round(match.compatibility_score)}%</div>
                            <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>match</div>
                          </div>
                          <ChevronDown size={20} color="var(--text-dim)" style={{ transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }} />
                        </div>
                        {isExpanded && (
                          <div className="anim-fade-in match-card-expanded" style={{ padding: "0 24px 24px", borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                            {match.has_apartment != null && (
                              <div style={{ marginBottom: 12 }}>
                                {match.has_apartment ? (
                                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.09)", border: "1px solid rgba(16,185,129,0.35)", borderRadius: 8, padding: "5px 10px" }}>
                                    <Home size={14} style={{ display: "inline", verticalAlign: "middle" }} />
                                    <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Has a Place — Looking for Roommates</span>
                                  </div>
                                ) : (
                                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.accentGlow, border: "1px solid rgba(99,102,241,0.25)", borderRadius: 8, padding: "5px 10px" }}>
                                    <Search size={14} style={{ display: "inline", verticalAlign: "middle" }} />
                                    <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>Looking for a Place</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {match.bio && <div style={{ background: C.surfaceLight, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}><div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>About</div><div style={{ fontSize: 14, lineHeight: 1.6 }}>{match.bio}</div></div>}
                            <div className="match-expanded-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                              {[
                                { label: match.has_apartment ? "Apt. Area" : "Area", value: match.area },
                                { label: match.has_apartment ? "Rent/person" : "Budget", value: match.budget },
                                ...(match.has_apartment ? [
                                  { label: "Bedrooms", value: match.apartment_rooms },
                                  { label: "Spots open", value: match.spots_available },
                                  { label: "Available", value: match.apartment_available },
                                ] : [])
                              ].filter(d => d.value).map((d, j) => (
                                <div key={j} style={{ background: C.surfaceLight, borderRadius: 10, padding: "12px 16px" }}>
                                  <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{d.label}</div>
                                  <div style={{ fontSize: 14, fontWeight: 500 }}>{d.value}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 12 }}>
                              <button className="btn-primary" style={{ flex: 1, padding: "12px", fontSize: 14 }} onClick={(e) => { e.stopPropagation(); navigate("/messages", { state: { selectedMatch: match } }); }}>
                                <>Send Message <MessageCircle size={14} style={{ display: "inline", verticalAlign: "middle" }} /></>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setProfileMatch(match); }}
                                style={{ padding: "12px 16px", fontSize: 14, borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 6 }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
                              >
                                <ExternalLink size={14} style={{ display: "inline", verticalAlign: "middle" }} /> View Profile
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ textAlign: "center", marginTop: 48 }}><button className="btn-secondary" style={{ padding: "12px 28px", fontSize: 14 }} onClick={() => navigate("/questionnaire")}>Retake questionnaire ↻</button></div>
              </>
            )}
          </>
        )}
      </div>

      {/* Profile View Modal */}
      {profileMatch && (
        <ProfileModal
          profileData={{
            ...profileMatch,
            user_id: profileMatch.other_user_id || profileMatch.user_id,
            compatibility_score: profileMatch.compatibility_score,
          }}
          onClose={() => setProfileMatch(null)}
          currentUser={user}
          onMessage={() => {
            setProfileMatch(null);
            navigate("/messages", { state: { selectedMatch: profileMatch } });
          }}
        />
      )}
    </div>
  );
}
