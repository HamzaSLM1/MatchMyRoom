# MatchMyRoom API Reference

Base URL: `http://localhost:8000`

## Authentication

All authenticated endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

Tokens are obtained via the login endpoint and expire after 72 hours.

---

## Public Endpoints

### POST /api/signup
Create a new user account. Only McGill and Concordia email domains are accepted.

**Body:**
| Field    | Type   | Required | Notes                            |
|----------|--------|----------|----------------------------------|
| name     | string | yes      | 1-200 characters                 |
| email    | string | yes      | Must be @mcgill.ca, @mail.mcgill.ca, @concordia.ca, or @live.concordia.ca |
| password | string | yes      | 8-72 characters                  |

**Response (200):** `AuthResponse` with `user_id`, `email`, `name`, `university`, `dev_code` (dev mode only)

**Rate limit:** 5/minute

---

### POST /api/verify-email
Verify a user's email with the 6-digit code sent to their inbox.

**Body:**
| Field | Type   | Required |
|-------|--------|----------|
| email | string | yes      |
| code  | string | yes      |

**Response (200):** `{ message, email_verified }`

**Rate limit:** 10/minute

---

### POST /api/resend-verification-code
Resend the verification code. Resets attempt counter.

**Body:**
| Field | Type   | Required |
|-------|--------|----------|
| email | string | yes      |

**Rate limit:** 3/minute

---

### POST /api/login
Authenticate and receive a JWT token.

**Body:**
| Field    | Type   | Required |
|----------|--------|----------|
| email    | string | yes      |
| password | string | yes      |

**Response (200):** `AuthResponse` with `token`

**Rate limit:** 10/minute

---

### GET /api/health
Health check.

**Response (200):** `{ status: "ok", users: <count>, database: "connected" }`

---

## Authenticated Endpoints

### GET /api/profile/{user_id}
Get a user's profile.

**Response (200):** `UserProfile`

---

### POST /api/profile/update?user_id={id}
Update own profile. Cannot update another user's profile.

**Body:**
| Field        | Type              | Required |
|--------------|-------------------|----------|
| bio          | string (max 500)  | no       |
| social_links | object            | no       |

---

### POST /api/profile/upload-picture?user_id={id}
Upload a profile picture (multipart form, max 5MB, JPEG/PNG/WebP).

---

### POST /api/questionnaire/submit?user_id={id}
Submit or update questionnaire responses.

**Body:**
| Field     | Type                      | Required |
|-----------|---------------------------|----------|
| responses | object (string -> int/str)| yes      |

---

### POST /api/matches/calculate?user_id={id}
Calculate compatibility matches for a user. Stores matches with score > 50.

**Note:** This endpoint does not require authentication (potential security issue).

---

### GET /api/matches/{user_id}?skip=0&limit=50
Get matches for a user, sorted by compatibility score descending.

**Response (200):** `List[MatchResponse]`

---

### POST /api/swipes/like?user_id={id}
Record a swipe (like or pass). Returns mutual match status.

**Body:**
| Field         | Type    | Required |
|---------------|---------|----------|
| liked_user_id | integer | yes      |
| is_like       | boolean | yes      |

**Response (200):** `SwipeResponse` with `is_mutual_match`, `match_name`

---

### GET /api/swipes/check-like/{user_id1}/{user_id2}
Check if user1 has liked user2.

**Response (200):** `{ has_liked: boolean }`

---

### POST /api/messages/send?sender_id={id}
Send a message to another user.

**Body:**
| Field        | Type    | Required |
|--------------|---------|----------|
| recipient_id | integer | yes      |
| content      | string  | yes      |

---

### GET /api/messages/conversations/{user_id}
Get all conversations with previews, sorted by most recent.

**Response (200):** `List[ConversationPreview]`

---

### GET /api/messages/thread/{user_id}/{other_user_id}
Get all messages between two users. Marks incoming messages as read.

**Response (200):** `List[MessageResponse]`

---

### POST /api/messages/mark-read/{message_id}
Mark a message as read. Only the recipient can do this.

---

## Dev-Only Endpoints

### POST /api/dev/create-fake-users
Creates 10 fake users with completed questionnaires. Disabled in production.
