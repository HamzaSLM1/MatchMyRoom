import { useState, useEffect } from "react";
import { applyTheme } from "../theme/colors";
import { getConversations } from "../utils/api";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [devCode, setDevCode] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("mmr_token");
    const savedUser = localStorage.getItem("mmr_user");
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(userData);
        applyTheme(userData.university);
      } catch {
        localStorage.removeItem("mmr_token");
        localStorage.removeItem("mmr_user");
      }
    }
  }, []);

  // Fetch unread count periodically
  useEffect(() => {
    if (user && token) {
      applyTheme(user.university);
      const fetchUnread = async () => {
        try {
          const response = await getConversations(user.user_id, token);
          if (response.ok) {
            const data = await response.json();
            const total = data.reduce((sum, conv) => sum + conv.unread_count, 0);
            setUnreadCount(total);
          }
        } catch (err) {
          console.error("Error fetching unread count:", err);
        }
      };
      fetchUnread();
      // Reduced from 10s to 60s — real-time updates are handled via WebSocket in MessagesPage
      const interval = setInterval(fetchUnread, 60000);
      return () => clearInterval(interval);
    }
  }, [user, token]);

  const handleAuth = (userData) => {
    const authToken = userData.token;
    setToken(authToken);
    setUser(userData);
    localStorage.setItem("mmr_token", authToken);
    localStorage.setItem("mmr_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("mmr_token");
    localStorage.removeItem("mmr_user");
  };

  const isLoggedIn = !!user;

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem("mmr_user", JSON.stringify(updatedUser));
  };

  return {
    user,
    token,
    isLoggedIn,
    unreadCount,
    pendingEmail,
    devCode,
    setPendingEmail,
    setDevCode,
    login: handleAuth,
    logout: handleLogout,
    updateUser,
  };
}
