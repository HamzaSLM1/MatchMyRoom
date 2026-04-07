import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { C, font } from "../theme/colors";
import { authFetch } from "../utils/api";
import ProfileModal from "../components/ProfileModal";
import { useWebSocket } from "../hooks/useWebSocket";
import { MessageCircle } from "lucide-react";

// Feature 3 helper: format last_seen timestamp into a human-readable string
function formatLastSeen(lastSeen, isOnline) {
  if (isOnline) return null; // Online — show dot instead
  if (!lastSeen) return 'Last seen recently';
  const diff = Date.now() - new Date(lastSeen).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Last seen ${days}d ago`;
}

// Feature 4: CSS for the animated typing dots
const typingDotCSS = `
@keyframes typing-dot {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}
`;

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
  // Keep a ref to selectedUser so the WS effect always has its current value
  const selectedUserRef = useRef(selectedUser);
  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  // Feature 4: typing state
  const [typingUsers, setTypingUsers] = useState(new Set()); // set of user_ids who are typing
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // WebSocket for real-time updates (degrades gracefully if WS is unavailable)
  const { lastMessage, sendMessage, isConnected } = useWebSocket(user?.user_id, token);

  // React to incoming WS messages
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'typing') {
      setTypingUsers(prev => new Set([...prev, lastMessage.sender_id]));
      // Auto-clear after 3 seconds in case stop_typing is missed
      setTimeout(() => {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(lastMessage.sender_id);
          return next;
        });
      }, 3000);
    } else if (lastMessage.type === 'stop_typing') {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(lastMessage.sender_id);
        return next;
      });
    } else if (lastMessage.type === 'new_message') {
      fetchConversations();
      const current = selectedUserRef.current;
      if (current && lastMessage.sender_id === current.user_id) {
        fetchThread(current.user_id);
      }
    }
  }, [lastMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedMatchFromNav) {
      setSelectedUser(selectedMatchFromNav);
      fetchThread(selectedMatchFromNav.user_id);
    }
  }, [selectedMatchFromNav]);

  // Conversations: initial load + 30s fallback poll (WS handles real-time updates)
  useEffect(() => { fetchConversations(); const interval = setInterval(fetchConversations, 30000); return () => clearInterval(interval); }, [user.user_id]);
  // Thread: initial load on selection + 15s fallback poll (WS handles real-time updates)
  useEffect(() => { if (selectedUser) { fetchThread(selectedUser.user_id); const interval = setInterval(() => fetchThread(selectedUser.user_id), 15000); return () => clearInterval(interval); } }, [selectedUser]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchConversations = async () => {
    try { const response = await authFetch(`/api/messages/conversations/${user.user_id}`, {}, token); if (response.ok) { const data = await response.json(); setConversations(data); } } catch (err) { console.error("Error fetching conversations:", err); }
  };

  const fetchThread = async (otherUserId) => {
    try { const response = await authFetch(`/api/messages/thread/${user.user_id}/${otherUserId}`, {}, token); if (response.ok) { const data = await response.json(); setMessages(data); } } catch (err) { console.error("Error fetching thread:", err); }
  };

  // Feature 4: handle message input change — also sends WS typing events
  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);

    if (selectedUser && sendMessage) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        sendMessage({ type: 'typing', recipient_id: selectedUser.user_id });
      }
      // Debounce stop_typing — fires 2s after the user stops typing
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        sendMessage({ type: 'stop_typing', recipient_id: selectedUser.user_id });
      }, 2000);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    // Feature 4: clear typing state on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
    if (selectedUser && sendMessage) {
      sendMessage({ type: 'stop_typing', recipient_id: selectedUser.user_id });
    }
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
      {/* Feature 4: inject typing-dot animation */}
      <style>{typingDotCSS}</style>

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
          {conversations.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <MessageCircle size={56} color="var(--text-muted)" />
              </div>
              <div>No conversations yet</div>
              <button className="btn-secondary" style={{ marginTop: 16, padding: "10px 20px", fontSize: 14 }} onClick={() => navigate("/dashboard")}>
                Find matches
              </button>
            </div>
          ) : conversations.map((conv, i) => (
            <div key={i} onClick={() => { setSelectedUser(conv); fetchThread(conv.user_id); }} style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: selectedUser?.user_id === conv.user_id ? C.surfaceLight : "transparent", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = C.surfaceLight} onMouseLeave={e => e.currentTarget.style.background = selectedUser?.user_id === conv.user_id ? C.surfaceLight : "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div onClick={(e) => { e.stopPropagation(); handleViewProfile(conv); }} style={{ cursor: "pointer", flexShrink: 0 }} title="View profile">
                  {conv.profile_pic_url ? <img src={conv.profile_pic_url} alt={conv.name} style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", display: "block" }} /> : <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.accentSoft})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 16, fontWeight: 700, color: "white" }}>{getInitials(conv.name)}</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Feature 3: name + online indicator in conversation list */}
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, display: "flex", alignItems: "center" }}>
                    {conv.name}
                    {conv.is_online ? (
                      <span style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: '#2ed573', marginLeft: 6, verticalAlign: 'middle', flexShrink: 0
                      }} title="Online" />
                    ) : conv.last_seen ? (
                      <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6, fontWeight: 400 }}>
                        {formatLastSeen(conv.last_seen, false)}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 13, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.last_message}</div>
                </div>
                {conv.unread_count > 0 && <div style={{ background: C.accent, color: "white", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{conv.unread_count}</div>}
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
                  <div>
                    {/* Feature 3: name + online indicator in chat header */}
                    <div style={{ fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center" }}>
                      {selectedUser.name}
                      {selectedUser.is_online ? (
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          background: '#2ed573', marginLeft: 6, verticalAlign: 'middle', flexShrink: 0
                        }} title="Online" />
                      ) : selectedUser.last_seen ? (
                        <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6, fontWeight: 400 }}>
                          {formatLastSeen(selectedUser.last_seen, false)}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 13, color: C.textMuted }}>{selectedUser.university === "concordia" ? "Concordia" : "McGill"} Student</div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.user_id;
                  return <div key={i} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}><div style={{ maxWidth: "70%", padding: "12px 16px", borderRadius: 12, background: isMe ? C.accent : C.surface, color: isMe ? "white" : C.text }}><div style={{ fontSize: 15, lineHeight: 1.5 }}>{msg.content}</div><div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div></div>;
                })}
                <div ref={messagesEndRef} />
              </div>
              {/* Feature 4: typing indicator */}
              {selectedUser && typingUsers.has(selectedUser.user_id) && (
                <div style={{
                  padding: '6px 24px', color: '#999', fontStyle: 'italic', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <span style={{ display: 'flex', gap: 3 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 5, height: 5, borderRadius: '50%', background: '#ccc',
                        display: 'inline-block',
                        animation: 'typing-dot 1.4s infinite',
                        animationDelay: `${i * 0.2}s`
                      }} />
                    ))}
                  </span>
                  {selectedUser.first_name || selectedUser.name} is typing...
                </div>
              )}
              <div className="messages-input-bar" style={{ padding: "20px 24px", borderTop: `1px solid ${C.border}`, background: C.surface, display: "flex", gap: 12 }}>
                <input className="input-field" placeholder="Type a message..." value={newMessage} onChange={handleMessageChange} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()} style={{ flex: 1 }} />
                <button className="btn-primary" onClick={handleSendMessage} disabled={loading || !newMessage.trim()} style={{ padding: "14px 24px", opacity: loading || !newMessage.trim() ? 0.5 : 1 }}>Send</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: C.textMuted }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <MessageCircle size={56} color="var(--text-muted)" />
              </div>
              <div style={{ fontSize: 18 }}>Select a conversation to start messaging</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
