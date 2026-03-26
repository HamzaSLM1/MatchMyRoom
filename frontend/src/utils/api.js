const API_BASE = "/api";

const authFetch = async (url, options = {}, token) => {
  const headers = { ...options.headers };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem("mmr_token");
    localStorage.removeItem("mmr_user");
    window.location.reload();
  }
  return response;
};

// Auth (no token needed)
export const login = (email, password) =>
  fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

export const signup = (name, email, password) =>
  fetch(`${API_BASE}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

export const verifyEmail = (email, code) =>
  fetch(`${API_BASE}/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

export const resendCode = (email) =>
  fetch(`${API_BASE}/resend-verification-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

// Profile
export const getProfile = (id, token) =>
  authFetch(`${API_BASE}/profile/${id}`, {}, token);

export const updateProfile = (userId, data, token) =>
  authFetch(`${API_BASE}/profile/update?user_id=${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, token);

export const uploadProfilePicture = (userId, file, token) => {
  const formData = new FormData();
  formData.append("file", file);
  return authFetch(`${API_BASE}/profile/upload-picture?user_id=${userId}`, {
    method: "POST",
    body: formData,
  }, token);
};

// Questionnaire
export const submitQuestionnaire = (userId, responses, token) =>
  authFetch(`${API_BASE}/questionnaire/submit?user_id=${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responses }),
  }, token);

// Matches
export const calculateMatches = (userId, token) =>
  authFetch(`${API_BASE}/matches/calculate?user_id=${userId}`, {
    method: "POST",
  }, token);

export const getMatches = (userId, token) =>
  authFetch(`${API_BASE}/matches/${userId}`, {}, token);

// Swipes
export const recordSwipe = (userId, likedUserId, isLike, token) =>
  authFetch(`${API_BASE}/swipes/like?user_id=${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ liked_user_id: likedUserId, is_like: isLike }),
  }, token);

export const getSwipeHistory = (userId, token) =>
  authFetch(`${API_BASE}/swipes/history/${userId}`, {}, token);

// Messages
export const sendMessage = (senderId, recipientId, content, token) =>
  authFetch(`${API_BASE}/messages/send?sender_id=${senderId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient_id: recipientId, content }),
  }, token);

export const getConversations = (userId, token) =>
  authFetch(`${API_BASE}/messages/conversations/${userId}`, {}, token);

export const getThread = (userId, otherUserId, token) =>
  authFetch(`${API_BASE}/messages/thread/${userId}/${otherUserId}`, {}, token);

// Account management
export const deleteAccount = (userId, token) =>
  authFetch(`${API_BASE}/users/${userId}`, {
    method: "DELETE",
  }, token);

// Block / Report
export const blockUser = (userId, blockedUserId, token) =>
  authFetch(`${API_BASE}/users/${userId}/block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocked_user_id: blockedUserId }),
  }, token);

export const reportUser = (userId, reportedUserId, reason, token) =>
  authFetch(`${API_BASE}/users/${userId}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reported_user_id: reportedUserId, reason }),
  }, token);

export { API_BASE, authFetch };
