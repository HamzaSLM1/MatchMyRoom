import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C, font } from "../theme/colors";
import { getSwipeHistory, getProfile } from "../utils/api";
import ProfileModal from "../components/ProfileModal";
import { Heart, Clock, MessageCircle, User, GraduationCap } from "lucide-react";

function getInitials(name) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Avatar({ user }) {
  if (user.profile_pic_url) {
    return (
      <img
        src={user.profile_pic_url}
        alt={user.name}
        style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: font.display, fontSize: 18, fontWeight: 700, color: "white"
    }}>
      {getInitials(user.name)}
    </div>
  );
}

function SwipeCard({ entry, onViewProfile, onMessage, isMutual }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: 16, marginBottom: 12
    }}>
      <Avatar user={entry} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 2 }}>
          {entry.name}
        </div>
        <div style={{ fontSize: 13, color: C.textMuted, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <GraduationCap size={12} style={{ display: "inline", verticalAlign: "middle" }} />
            {entry.university === "concordia" ? "Concordia" : "McGill"}
          </span>
          {entry.program && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <User size={12} style={{ display: "inline", verticalAlign: "middle" }} />
              {entry.program}
            </span>
          )}
          {!isMutual && entry.swiped_at && (
            <span style={{ color: C.textDim, fontSize: 12 }}>{timeAgo(entry.swiped_at)}</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {isMutual && (
          <button
            className="btn-primary"
            style={{ padding: "8px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => onMessage(entry)}
          >
            <MessageCircle size={14} style={{ display: "inline", verticalAlign: "middle" }} />
            Message
          </button>
        )}
        <button
          className="btn-secondary"
          style={{ padding: "8px 14px", fontSize: 13 }}
          onClick={() => onViewProfile(entry.user_id)}
        >
          View Profile
        </button>
      </div>
    </div>
  );
}

export default function MySwipesPage({ user, token }) {
  const navigate = useNavigate();
  const [mutuals, setMutuals] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileModal, setProfileModal] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getSwipeHistory(user.user_id, token);
        if (res.ok) {
          const data = await res.json();
          setMutuals(data.filter(d => d.is_mutual));
          setPending(data.filter(d => !d.is_mutual));
        }
      } catch (err) {
        console.error("Error fetching swipe history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user.user_id, token]);

  const handleViewProfile = async (userId) => {
    try {
      const res = await getProfile(userId, token);
      if (res.ok) {
        const data = await res.json();
        setProfileModal(data);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const handleMessage = (entry) => {
    navigate("/messages", {
      state: {
        selectedMatch: {
          user_id: entry.user_id,
          name: entry.name,
          profile_pic_url: entry.profile_pic_url,
          university: entry.university,
        }
      }
    });
  };

  const handleBlock = (blockedUserId) => {
    setMutuals(prev => prev.filter(e => e.user_id !== blockedUserId));
    setPending(prev => prev.filter(e => e.user_id !== blockedUserId));
  };

  const isEmpty = !loading && mutuals.length === 0 && pending.length === 0;

  return (
    <div style={{ minHeight: "100vh", padding: "100px 24px 60px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 6 }}>
            My Swipes
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted }}>
            Everyone you've liked — mutual matches can be messaged directly.
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: C.textMuted, padding: 60 }}>Loading...</div>
        )}

        {isEmpty && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>👀</div>
            <p style={{ fontFamily: font.display, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>
              You haven't liked anyone yet.
            </p>
            <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24 }}>
              Head to the Dashboard to start swiping.
            </p>
            <button className="btn-primary" style={{ padding: "10px 24px" }} onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </button>
          </div>
        )}

        {!loading && mutuals.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Heart size={18} color={C.green} fill={C.green} style={{ display: "inline", verticalAlign: "middle" }} />
              <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 16, color: C.text }}>
                Mutual Matches
              </span>
              <span style={{
                background: "rgba(16,185,129,0.09)", border: "1px solid rgba(16,185,129,0.35)",
                color: C.green, borderRadius: 100, padding: "2px 10px", fontSize: 12, fontWeight: 700
              }}>
                {mutuals.length}
              </span>
            </div>
            {mutuals.map(entry => (
              <SwipeCard
                key={entry.user_id}
                entry={entry}
                isMutual={true}
                onViewProfile={handleViewProfile}
                onMessage={handleMessage}
              />
            ))}
          </section>
        )}

        {!loading && pending.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Clock size={18} color={C.textMuted} style={{ display: "inline", verticalAlign: "middle" }} />
              <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 16, color: C.text }}>
                Pending Likes
              </span>
              <span style={{
                background: C.surfaceLight, border: `1px solid ${C.border}`,
                color: C.textMuted, borderRadius: 100, padding: "2px 10px", fontSize: 12, fontWeight: 700
              }}>
                {pending.length}
              </span>
            </div>
            {pending.map(entry => (
              <SwipeCard
                key={entry.user_id}
                entry={entry}
                isMutual={false}
                onViewProfile={handleViewProfile}
                onMessage={handleMessage}
              />
            ))}
          </section>
        )}
      </div>

      {profileModal && (
        <ProfileModal
          profileData={profileModal}
          onClose={() => setProfileModal(null)}
          currentUser={user}
          onMessage={(profileData) => handleMessage({
            user_id: profileData.user_id,
            name: profileData.name,
            profile_pic_url: profileData.profile_pic_url,
            university: profileData.university,
          })}
          onBlock={(blockedUserId) => {
            handleBlock(blockedUserId);
            setProfileModal(null);
          }}
        />
      )}
    </div>
  );
}
