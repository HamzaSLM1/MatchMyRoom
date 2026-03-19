import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, font } from "../theme/colors";
import { authFetch } from "../utils/api";
import SwipeCard from "../components/SwipeCard";
import ProfileModal from "../components/ProfileModal";

export default function SwipeInterface({ matches, user, token }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedMatches, setSwipedMatches] = useState({ interested: [], passed: [] });
  const [messagePrompt, setMessagePrompt] = useState(null);
  const [promptMessage, setPromptMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [mutualMatchAlert, setMutualMatchAlert] = useState(null);
  const [profileModal, setProfileModal] = useState(null);

  const recordSwipe = async (match, isLike) => {
    try {
      const response = await authFetch(`/api/swipes/like?user_id=${user.user_id}`, {
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
      await authFetch(`/api/messages/send?sender_id=${user.user_id}`, {
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

      {/* Full profile modal */}
      {profileModal && (
        <ProfileModal
          profileData={profileModal}
          onClose={() => setProfileModal(null)}
          currentUser={user}
          onBlock={(blockedUserId) => {
            setProfileModal(null);
          }}
        />
      )}

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
          <div className="swipe-instruction-bar" style={{ textAlign: "center", marginBottom: 24, padding: "16px 24px", background: C.surfaceLight, borderRadius: 12, border: `1px solid ${C.border}`, maxWidth: 480 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>Swipe right if interested, left to pass</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>Or use the buttons below · <span style={{ color: C.accent }}>Tap the card</span> to view full profile</div>
          </div>
          <div style={{ position: "relative", width: "100%", maxWidth: 480, height: 580, marginBottom: 32 }}>
            {remainingMatches.slice(0, 2).reverse().map((match, idx) => (
              <SwipeCard
                key={match.id}
                match={match}
                onSwipe={handleSwipe}
                getInitials={getInitials}
                isTop={idx === 1}
                onViewProfile={idx === 1 ? () => setProfileModal(match) : null}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <button
              onClick={() => handleButtonSwipe("left")}
              style={{
                width: 64, height: 64, borderRadius: "50%", border: `2px solid ${C.border}`,
                background: C.surface, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32, cursor: "pointer", transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.borderColor = C.textMuted; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = C.border; }}
            >
              ✕
            </button>

            <button
              onClick={() => handleButtonSwipe("right")}
              style={{
                width: 64, height: 64, borderRadius: "50%", border: `2px solid ${C.green}`,
                background: C.green, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32, cursor: "pointer", transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(34,197,94,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; }}
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
              <button className="btn-primary" style={{ padding: "12px 24px" }} onClick={() => navigate("/messages")}>
                View Conversations
              </button>
            )}
            <button className="btn-secondary" style={{ padding: "12px 24px" }} onClick={() => navigate("/dashboard")}>
              Back to List View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
