import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C, font } from "../theme/colors";
import { authFetch, deleteAccount } from "../utils/api";
import { Camera, Briefcase, AtSign, CheckCircle, Link, Copy, Trash2 } from "lucide-react";

export default function ProfileEditPage({ user, token, onProfileUpdate }) {
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [socials, setSocials] = useState({ instagram: "", linkedin: "", twitter: "" });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [shareLink, setShareLink] = useState(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authFetch(`/api/profile/${user.user_id}`, {}, token);
        if (response.ok) {
          const data = await response.json();
          setBio(data.bio || "");
          if (data.profile_pic_url) setPreviewUrl(data.profile_pic_url);
          if (data.social_links) setSocials({ instagram: data.social_links.instagram || "", linkedin: data.social_links.linkedin || "", twitter: data.social_links.twitter || "" });
        }
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
      const social_links = { instagram: socials.instagram.trim(), linkedin: socials.linkedin.trim(), twitter: socials.twitter.trim() };
      await authFetch(`/api/profile/update?user_id=${user.user_id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bio, social_links }) }, token);
      if (profilePicture) { const formData = new FormData(); formData.append("file", profilePicture); await authFetch(`/api/profile/upload-picture?user_id=${user.user_id}`, { method: "POST", body: formData }, token); }
      setSuccess(true); onProfileUpdate(); setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) { alert("Error saving profile"); } finally { setLoading(false); }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const response = await deleteAccount(user.user_id, token);
      if (response.ok) {
        localStorage.removeItem("mmr_token");
        localStorage.removeItem("mmr_user");
        navigate("/");
      } else {
        setDeleteError("Something went wrong. Please try again.");
        setDeleteLoading(false);
      }
    } catch (err) {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  };

  const handleGenerateShareLink = async () => {
    try {
      const res = await authFetch(`/api/profile/${user.user_id}/share-token`, {}, token);
      const data = await res.json();
      const fullUrl = `${window.location.origin}/profile/share/${data.share_token}`;
      setShareLink(fullUrl);
    } catch (err) {
      console.error("Error generating share link:", err);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const socialFields = [
    { key: "instagram", label: "Camera", icon: <Camera size={20} />, placeholder: "https://instagram.com/yourhandle" },
    { key: "linkedin", label: "LinkedIn", icon: <Briefcase size={20} />, placeholder: "https://linkedin.com/in/yourname" },
    { key: "twitter", label: "X / AtSign", icon: <AtSign size={20} />, placeholder: "https://x.com/yourhandle" },
  ];

  return (
    <div style={{ minHeight: "100vh", paddingTop: 80, padding: "100px 24px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font.display, fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>Edit Profile</h1>
        <p style={{ color: C.textMuted, fontSize: 16, marginBottom: 48 }}>Add a profile picture and tell potential roommates about yourself.</p>

        <div style={{ marginBottom: 32 }}>
          <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 12, display: "block" }}>Profile Picture</label>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {previewUrl ? <img src={previewUrl} alt="Profile" style={{ width: 100, height: 100, borderRadius: 16, objectFit: "cover", border: `2px solid ${C.border}` }} /> : <div style={{ width: 100, height: 100, borderRadius: 16, background: C.surface, border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Camera size={32} color="var(--text-dim)" /></div>}
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

        <div style={{ marginBottom: 32 }}>
          <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, display: "block" }}>Social Links</label>
          <p style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>Let matches find you on social media. Links will be visible on your profile.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {socialFields.map(({ key, label, icon, placeholder }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 28, flexShrink: 0, display: "flex", alignItems: "center", color: C.textMuted }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                  <input
                    className="input-field"
                    type="url"
                    placeholder={placeholder}
                    value={socials[key]}
                    onChange={(e) => setSocials(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{ fontSize: 14, padding: "10px 14px" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Share Your Profile */}
        <div style={{ marginBottom: 32, padding: 20, background: C.surfaceLight, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <h4 style={{ marginTop: 0, marginBottom: 12, fontFamily: font.display, fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Link size={16} /> Share Your Profile
          </h4>
          <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 12, marginTop: 0 }}>
            Share your roommate profile with friends in housing groups.
          </p>
          {!shareLink ? (
            <button
              onClick={handleGenerateShareLink}
              style={{
                padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.border}`,
                background: C.surface, color: C.text, fontSize: 14, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
            >
              Generate Share Link
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={shareLink}
                readOnly
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
                  fontSize: 13, fontFamily: font.body, background: C.surface, color: C.text
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  background: copying ? '#6bcb77' : C.accent,
                  color: 'white', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, transition: "background 0.2s", whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 6
                }}
              >
                <Copy size={16} /> {copying ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {success && (
          <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: "var(--success-bg)", border: "1px solid var(--success-border)", color: "#10B981", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle size={32} color="#10B981" /> Profile updated successfully!
          </div>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-secondary" style={{ flex: 1, padding: "15px" }} onClick={() => navigate("/dashboard")}>Cancel</button>
          <button className="btn-primary" style={{ flex: 1, padding: "15px", opacity: loading ? 0.7 : 1 }} onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Profile"}</button>
        </div>

        {/* Danger Zone */}
        <div style={{ marginTop: 48, borderTop: `1px solid rgba(200,0,0,0.2)`, paddingTop: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontFamily: font.display, fontSize: 20, fontWeight: 600, color: "var(--error)", marginBottom: 6 }}>Danger Zone</h3>
            <p style={{ fontSize: 14, color: C.textMuted }}>Once you delete your account, there is no going back.</p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{ padding: "12px 24px", background: "rgba(200,0,0,0.1)", border: "1px solid rgba(200,0,0,0.3)", color: "var(--error)", borderRadius: 10, fontFamily: font.body, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,0,0,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,0,0,0.1)"; }}
          >
            <Trash2 size={16} /> Delete My Account
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div onClick={() => setShowDeleteModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40, maxWidth: 420, width: "100%" }}>
              <h3 style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Delete Your Account</h3>
              <p style={{ color: C.textMuted, fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
                This will permanently delete your account, profile, matches, and messages. <strong style={{ color: C.text }}>This cannot be undone.</strong>
              </p>
              {deleteError && (
                <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error)", fontSize: 14, marginBottom: 16 }}>
                  {deleteError}
                </div>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => { setShowDeleteModal(false); setDeleteError(""); }}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  style={{ flex: 1, padding: "14px 24px", background: "#c00", border: "none", color: "white", borderRadius: 12, fontFamily: font.body, fontWeight: 600, fontSize: 15, cursor: deleteLoading ? "not-allowed" : "pointer", opacity: deleteLoading ? 0.7 : 1 }}
                >
                  {deleteLoading ? "Deleting..." : "Delete Forever"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
