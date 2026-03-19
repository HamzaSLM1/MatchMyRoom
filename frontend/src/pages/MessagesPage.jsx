import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { C, font } from "../theme/colors";
import { authFetch } from "../utils/api";
import ProfileModal from "../components/ProfileModal";

export default function MessagesPage({ user, token }) {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedMatchFromNav = location.state?.selectedMatch || null;

  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(selectedMatchFromNav);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalData, setProfileModalData] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (selectedMatchFromNav) {
      setSelectedUser(selectedMatchFromNav);
      fetchThread(selectedMatchFromNav.user_id);
    }
  }, [selectedMatchFromNav]);

  useEffect(() => { fetchConversations(); const interval = setInterval(fetchConversations, 5000); return () => clearInterval(interval); }, [user.user_id]);
  useEffect(() => { if (selectedUser) { const interval = setInterval(() => fetchThread(selectedUser.user_id), 3000); return () => clearInterval(interval); } }, [selectedUser]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchConversations = async () => {
    try { const response = await authFetch(`/api/messages/conversations/${user.user_id}`, {}, token); if (response.ok) { const data = await response.json(); setConversations(data); } } catch (err) { console.error("Error fetching conversations:", err); }
  };

  const fetchThread = async (otherUserId) => {
    try { const response = await authFetch(`/api/messages/thread/${user.user_id}/${otherUserId}`, {}, token); if (response.ok) { const data = await response.json(); setMessages(data); } } catch (err) { console.error("Error fetching thread:", err); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    setLoading(true);
    try {
      const response = await authFetch(`/api/messages/send?sender_id=${user.user_id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient_id: selectedUser.user_id, content: newMessage }) }, token);
      if (response.ok) { setNewMessage(""); fetchThread(selectedUser.user_id); fetchConversations(); }
    } catch (err) { console.error("Error sending message:", err); } finally { setLoading(false); }
  };

  const getInitials = (name) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const handleViewProfile = async (targetUser) => {
    try {
      const response = await authFetch(`/api/profile/${targetUser.user_id}`, {}, token);
      if (response.ok) {
        const data = await response.json();
        setProfileModalData({ ...targetUser, ...data });
        setShowProfileModal(true);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  return (
    <div style={{ minHeight: "100vh", paddingTop: 80, padding: "80px 0 0" }}>
      {showProfileModal && profileModalData && (
        <ProfileModal
          profileData={profileModalData}
          onClose={() => setShowProfileModal(false)}
          currentUser={user}
          onBlock={() => setShowProfileModal(false)}
        />
      )}

      <div className="messages-layout" style={{ maxWidth: 1200, margin: "0 auto", height: "calc(100vh - 80px)", display: "flex" }}>
        <div className="messages-sidebar" style={{ width: 320, borderRight: `1px solid ${C.border}`, overflowY: "auto", background: C.surface }}>
          <div style={{ padding: "24px 20px", borderBottom: `1px solid ${C.border}` }}><h2 style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700 }}>Messages</h2></div>
          {conversations.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}><div style={{ fontSize: 48, marginBottom: 16 }}>💬</div><div>No conversations yet</div><button className="btn-secondary" style={{ marginTop: 16, padding: "10px 20px", fontSize: 14 }} onClick={() => navigate("/dashboard")}>Find matches</button></div> : conversations.map((conv, i) => (
            <div key={i} onClick={() => { setSelectedUser(conv); fetchThread(conv.user_id); }} style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: selectedUser?.user_id === conv.user_id ? C.surfaceLight : "transparent", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = C.surfaceLight} onMouseLeave={e => e.currentTarget.style.background = selectedUser?.user_id === conv.user_id ? C.surfaceLight : "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {conv.profile_pic_url ? <img src={conv.profile_pic_url} alt={conv.name} style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover" }} /> : <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 16, fontWeight: 700, color: "white" }}>{getInitials(conv.name)}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{conv.name}</div>
                  <div style={{ fontSize: 13, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.last_message}</div>
                </div>
                {conv.unread_count > 0 && <div style={{ background: C.mcgillRed, color: "white", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{conv.unread_count}</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="messages-thread" style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
          {selectedUser ? (
            <>
              <div className="messages-thread-header" style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, background: C.surface, display: "flex", alignItems: "center", gap: 12 }}>
                <div onClick={() => handleViewProfile(selectedUser)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "opacity 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
                  {selectedUser.profile_pic_url ? <img src={selectedUser.profile_pic_url} alt={selectedUser.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} /> : <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 14, fontWeight: 700, color: "white" }}>{getInitials(selectedUser.name)}</div>}
                  <div><div style={{ fontWeight: 600, fontSize: 16 }}>{selectedUser.name}</div><div style={{ fontSize: 13, color: C.textMuted }}>{selectedUser.university === "concordia" ? "Concordia" : "McGill"} Student</div></div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.user_id;
                  return <div key={i} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}><div style={{ maxWidth: "70%", padding: "12px 16px", borderRadius: 12, background: isMe ? C.accent : C.surface, color: isMe ? "white" : C.text }}><div style={{ fontSize: 15, lineHeight: 1.5 }}>{msg.content}</div><div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div></div>;
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="messages-input-bar" style={{ padding: "20px 24px", borderTop: `1px solid ${C.border}`, background: C.surface, display: "flex", gap: 12 }}>
                <input className="input-field" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()} style={{ flex: 1 }} />
                <button className="btn-primary" onClick={sendMessage} disabled={loading || !newMessage.trim()} style={{ padding: "14px 24px", opacity: loading || !newMessage.trim() ? 0.5 : 1 }}>Send</button>
              </div>
            </>
          ) : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: C.textMuted }}><div style={{ fontSize: 64, marginBottom: 16 }}>💬</div><div style={{ fontSize: 18 }}>Select a conversation to start messaging</div></div>}
        </div>
      </div>
    </div>
  );
}
