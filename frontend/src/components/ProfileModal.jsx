import { useState } from "react";
import { C, font } from "../theme/colors";
import { blockUser, reportUser } from "../utils/api";
import { X, GraduationCap, User, MapPin, DollarSign, Camera, Briefcase, AtSign, ExternalLink, MessageCircle } from "lucide-react";

function getInitials(name) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ProfileModal({ profileData, onClose, currentUser, onBlock, onMessage }) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Harassment");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  if (!profileData) return null;

  const handleBlock = async () => {
    if (!currentUser) return;
    const token = localStorage.getItem("mmr_token");
    setActionLoading(true);
    setActionError("");
    try {
      const response = await blockUser(currentUser.user_id, profileData.user_id, token);
      if (response.ok) {
        setActionMessage("User blocked.");
        setTimeout(() => {
          if (onBlock) onBlock(profileData.user_id);
          onClose();
        }, 1000);
      } else {
        const data = await response.json();
        if (data.detail && data.detail.includes("already blocked")) {
          setActionError("You have already blocked this user.");
        } else {
          setActionError("Something went wrong.");
        }
      }
    } catch (err) {
      setActionError("Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReport = async () => {
    if (!currentUser) return;
    const token = localStorage.getItem("mmr_token");
    setActionLoading(true);
    setActionError("");
    try {
      const response = await reportUser(currentUser.user_id, profileData.user_id, reportReason, token);
      if (response.ok) {
        setActionMessage("Report submitted. Thank you.");
        setTimeout(() => {
          setShowReportModal(false);
          onClose();
        }, 1500);
      } else {
        setActionError("Something went wrong.");
      }
    } catch (err) {
      setActionError("Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: 24, maxWidth: 500, width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: "50%", border: `1px solid ${C.border}`, background: C.surfaceLight, color: C.text, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <X size={18} />
        </button>

        <div style={{ height: 320, position: "relative", overflow: "hidden", borderRadius: "24px 24px 0 0", background: "rgba(99,102,241,0.12)" }}>
          {profileData.profile_pic_url ? (
            <img src={profileData.profile_pic_url} alt={profileData.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})` }}>
              <span style={{ fontFamily: font.display, fontSize: 80, fontWeight: 900, color: "white", opacity: 0.9 }}>{getInitials(profileData.name)}</span>
            </div>
          )}
        </div>

        <div style={{ padding: 24 }}>
          <h2 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{profileData.name}</h2>
          <div style={{ fontSize: 15, color: C.textMuted, marginBottom: 16 }}>{profileData.university === "concordia" ? "Concordia" : "McGill"} Student{profileData.program ? ` · ${profileData.program}` : ""}</div>

          {profileData.compatibility_score && (
            <div style={{ display: "inline-block", background: profileData.compatibility_score >= 90 ? C.green : C.accent, color: "white", padding: "8px 16px", borderRadius: 100, fontWeight: 700, fontSize: 15, marginBottom: 20 }}>
              {Math.round(profileData.compatibility_score)}% Match
            </div>
          )}

          {profileData.bio && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 600 }}>About</div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: C.text, background: C.surfaceLight, padding: 16, borderRadius: 12 }}>{profileData.bio}</p>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontWeight: 600 }}>Key Preferences</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Program", value: profileData.program, icon: <GraduationCap size={14} /> },
                { label: "Gender", value: profileData.gender, icon: <User size={14} /> },
                { label: "Area", value: profileData.area || profileData.location, icon: <MapPin size={14} /> },
                { label: "Budget", value: profileData.budget, icon: <DollarSign size={14} /> }
              ].filter(d => d.value).map((d, j) => (
                <div key={j} style={{ background: C.surfaceLight, borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    {d.icon} {d.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>

          {profileData.social_links && Object.values(profileData.social_links).some(v => v) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontWeight: 600 }}>Socials</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { key: "instagram", label: "Camera", icon: <Camera size={18} /> },
                  { key: "linkedin", label: "LinkedIn", icon: <Briefcase size={18} /> },
                  { key: "twitter", label: "X / AtSign", icon: <AtSign size={18} /> },
                ].filter(s => profileData.social_links[s.key]).map(s => (
                  <a key={s.key} href={profileData.social_links[s.key]} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, background: C.surfaceLight, borderRadius: 10, padding: "10px 14px", color: C.text, textDecoration: "none", fontSize: 14, border: `1px solid ${C.border}`, transition: "border-color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                  >
                    <span style={{ display: "flex", alignItems: "center" }}>{s.icon}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.accent }}>{profileData.social_links[s.key]}</span>
                    <ExternalLink size={12} color={C.textDim} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {onMessage && (
            <button className="btn-primary" style={{ width: "100%", padding: "14px", fontSize: 15, marginBottom: 10 }} onClick={onMessage}>
              <>Send Message <MessageCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginLeft: 6 }} /></>
            </button>
          )}

          <button className="btn-secondary" style={{ width: "100%", padding: "14px", fontSize: 15 }} onClick={onClose}>
            Close
          </button>

          {/* Block / Report Actions (only show if viewing someone else's profile) */}
          {currentUser && currentUser.user_id !== profileData.user_id && (
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 8 }}>
              {actionMessage && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--success-bg)", border: "1px solid var(--success-border)", color: "#10B981", fontSize: 14, marginBottom: 12 }}>
                  {actionMessage}
                </div>
              )}
              {actionError && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error)", fontSize: 14, marginBottom: 12 }}>
                  {actionError}
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleBlock}
                  disabled={actionLoading}
                  style={{ flex: 1, padding: "10px 16px", background: C.surfaceLight, border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 10, fontFamily: font.body, fontSize: 13, fontWeight: 500, cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.6 : 1 }}
                  onMouseEnter={e => { e.target.style.borderColor = "#888"; e.target.style.color = C.text; }}
                  onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.textMuted; }}
                >
                  Block User
                </button>
                <button
                  onClick={() => { setShowReportModal(true); setActionError(""); }}
                  disabled={actionLoading}
                  style={{ flex: 1, padding: "10px 16px", background: C.surfaceLight, border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 10, fontFamily: font.body, fontSize: 13, fontWeight: 500, cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.6 : 1 }}
                  onMouseEnter={e => { e.target.style.borderColor = "#888"; e.target.style.color = C.text; }}
                  onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.textMuted; }}
                >
                  Report User
                </button>
              </div>
            </div>
          )}

          {/* Report Modal */}
          {showReportModal && (
            <div onClick={() => setShowReportModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 3500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, maxWidth: 400, width: "100%" }}>
                <h3 style={{ fontFamily: font.display, fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Report User</h3>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 8, display: "block" }}>Reason</label>
                  <select
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    style={{ width: "100%", padding: "12px 16px", background: C.surfaceLight, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: font.body, fontSize: 14, cursor: "pointer" }}
                  >
                    <option value="Harassment">Harassment</option>
                    <option value="Fake Profile">Fake Profile</option>
                    <option value="Inappropriate Content">Inappropriate Content</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {actionError && (
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error)", fontSize: 14, marginBottom: 16 }}>
                    {actionError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, padding: "12px" }}
                    onClick={() => { setShowReportModal(false); setActionError(""); }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={actionLoading}
                    style={{ flex: 1, padding: "12px 20px", background: C.accent, border: "none", color: "white", borderRadius: 12, fontFamily: font.body, fontWeight: 600, fontSize: 14, cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.7 : 1 }}
                  >
                    {actionLoading ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
