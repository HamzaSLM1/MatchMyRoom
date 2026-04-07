import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, font } from "../theme/colors";
import { authFetch } from "../utils/api";
import { Sparkles, Lightbulb, Camera, Briefcase, AtSign } from "lucide-react";

export default function ProfileSetupPage({ user, token }) {
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [socials, setSocials] = useState({ instagram: "", linkedin: "", twitter: "" });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setProfilePicture(file); setPreviewUrl(URL.createObjectURL(file)); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const social_links = { instagram: socials.instagram.trim(), linkedin: socials.linkedin.trim(), twitter: socials.twitter.trim() };
      await authFetch(`/api/profile/update?user_id=${user.user_id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bio, social_links }) }, token);
      if (profilePicture) { const formData = new FormData(); formData.append("file", profilePicture); await authFetch(`/api/profile/upload-picture?user_id=${user.user_id}`, { method: "POST", body: formData }, token); }
      navigate("/dashboard");
    } catch (err) { alert("Error saving profile"); } finally { setLoading(false); }
  };

  const socialFields = [
    { key: "instagram", label: "Camera", icon: <Camera size={16} />, placeholder: "https://instagram.com/yourhandle" },
    { key: "linkedin", label: "LinkedIn", icon: <Briefcase size={16} />, placeholder: "https://linkedin.com/in/yourname" },
    { key: "twitter", label: "X / AtSign", icon: <AtSign size={16} />, placeholder: "https://x.com/yourhandle" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 60px" }}>
      <div className="anim-fade-up" style={{ width: "100%", maxWidth: 520 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <Sparkles size={48} color="var(--accent)" />
          </div>
          <h1 style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12 }}>
            You're almost there!
          </h1>
          <p style={{ color: C.textMuted, fontSize: 16, lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
            Finish your profile to stand out. Profiles with a photo, bio, and links get <span style={{ color: C.accent, fontWeight: 600 }}>3× more roommate interest.</span>
          </p>
        </div>

        {/* Visibility nudge */}
        <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 12, padding: "14px 18px", marginBottom: 36, display: "flex", alignItems: "center", gap: 12 }}>
          <Lightbulb size={18} color="var(--accent)" />
          <span style={{ fontSize: 14, color: "var(--accent)", lineHeight: 1.5 }}>
            A profile picture and short bio help potential roommates feel confident reaching out to you.
          </span>
        </div>

        {/* Profile Picture */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 12, display: "block", fontWeight: 500 }}>Profile Picture</label>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {previewUrl
              ? <img src={previewUrl} alt="Profile" style={{ width: 88, height: 88, borderRadius: 16, objectFit: "cover", border: `2px solid ${C.accent}` }} />
              : <div style={{ width: 88, height: 88, borderRadius: 16, background: C.surface, border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Camera size={28} color="var(--text-dim)" /></div>
            }
            <div>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} id="pfp-input" />
              <label htmlFor="pfp-input" className="btn-secondary" style={{ padding: "10px 20px", fontSize: 14, cursor: "pointer", display: "inline-block" }}>Choose Photo</label>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>JPG, PNG or WebP · Max 5MB</div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 12, display: "block", fontWeight: 500 }}>
            About You <span style={{ color: C.textDim, fontWeight: 400 }}>({bio.length}/500)</span>
          </label>
          <textarea
            className="input-field"
            placeholder="Tell potential roommates about yourself — your hobbies, lifestyle, what you're looking for..."
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 500))}
            style={{ minHeight: 130, resize: "vertical", fontFamily: font.body }}
          />
        </div>

        {/* Socials */}
        <div style={{ marginBottom: 36 }}>
          <label style={{ fontSize: 13, color: C.textMuted, marginBottom: 4, display: "block", fontWeight: 500 }}>Social Links</label>
          <p style={{ fontSize: 12, color: C.textDim, marginBottom: 14 }}>Let matches find you on social media.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button className="btn-primary" style={{ width: "100%", padding: "15px", opacity: loading ? 0.7 : 1 }} onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Complete Profile →"}
          </button>
          <button className="btn-secondary" style={{ width: "100%", padding: "15px", fontSize: 14 }} onClick={() => navigate("/dashboard")}>
            Skip for now
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: C.textDim, marginTop: 16 }}>
          You can always update your profile later from the dashboard.
        </p>
      </div>
    </div>
  );
}
