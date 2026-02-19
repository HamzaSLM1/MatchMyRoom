# MatchMyRoom Implementation Explained

## Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│  React Frontend │ ◄─HTTP─►│  FastAPI        │ ◄──────►│  SQLite         │
│  (Vite)         │         │  Backend        │         │  Database       │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                     │
                                     │ HTTP
                                     ▼
                            ┌─────────────────┐
                            │                 │
                            │  Cloudinary     │
                            │  (Images)       │
                            │                 │
                            └─────────────────┘
```

## Key Design Decisions & Why

### 1. Single-File Frontend (App.jsx)

**Why:** Rapid prototyping, easy to understand for beginners, no complex routing setup needed.

**Trade-off:** File becomes large (~1300 lines) but remains readable with clear section markers.

**Components in App.jsx:**
- `Logo` - Branding with university-specific colors
- `NavBar` - Navigation with unread message count
- `LandingPage` - Marketing/hero section
- `AuthPage` - Sign up & login (one component, two modes)
- `QuestionnairePage` - 14-question form with progress tracking
- `DashboardPage` - Match list with expandable details
- `ProfileEditPage` - Bio + picture upload
- `MessagesPage` - Inbox + chat interface

### 2. Theme System

**Dynamic Color Switching:**
```javascript
const applyTheme = (university) => {
  if (university === "concordia") {
    C.accent = C.concordiaMaroon;
    C.accentSoft = C.concordiaGold;
  } else {
    C.accent = C.mcgillRed;
  }
};
```

**How it works:**
1. User signs up with email
2. Backend detects university from domain
3. Backend returns `university: "mcgill"` or `"concordia"`
4. Frontend calls `applyTheme(university)`
5. All components use `C.accent` which updates dynamically

**Result:** McGill users see red, Concordia see maroon, automatically!

### 3. Matching Algorithm

**Location:** `backend/app/matching.py`

**Philosophy:** Weighted scoring prioritizes what matters most

**Weights Breakdown:**

```python
Total Score: 100 points

Budget (30 points):
├─ Exact match: 30 points
├─ Adjacent range: 20 points  # e.g., $600-800 vs $800-1000
├─ One range apart: 10 points
└─ Different ranges: 0 points

Location (25 points):
├─ Exact match: 25 points
├─ "Flexible" preference: 15 points
└─ Different areas: 0 points

Gender Preference (20 points):
├─ Both "no preference": 20 points
├─ Mutual match: 20 points
├─ One-way match: 10 points
└─ No match: 0 points

Lifestyle (25 points):
├─ Each factor (sleep/clean/noise/guests/study): 5 points
└─ Proportional to number of matches
```

**Why these weights?**
- **Budget** is financial - can't negotiate much → Highest weight
- **Location** affects commute, daily life → Second highest
- **Gender** preference for comfort → Important but not deal-breaker
- **Lifestyle** cumulative small factors → Moderate weight

**Special Rules:**
```python
# Pet compatibility bonus
if user1_has_pets and user2_welcomes_pets: score += 5

# Pet conflict penalty
if user1_allergic and user2_has_pets: score -= 10
```

**Match Threshold:** Only stores matches with score > 50%

### 4. Database Schema

**Why SQLite?**
- Zero configuration
- Single file (easy backup)
- Perfect for < 10,000 users
- Easy migration to PostgreSQL later

**Schema Design:**

```sql
Users
├─ id (PK)
├─ name, email (unique), password_hash
├─ university ("mcgill" | "concordia")
├─ bio (nullable, 500 chars)
├─ profile_pic_url (nullable, Cloudinary URL)
├─ questionnaire_completed (boolean)
└─ created_at (timestamp)

QuestionnaireResponses
├─ id (PK)
├─ user_id (FK → Users)
├─ responses (JSON: {"questionId": optionIndex})
└─ completed_at (timestamp)

Matches
├─ id (PK)
├─ user1_id (FK → Users)
├─ user2_id (FK → Users)
├─ compatibility_score (float, 0-100)
└─ created_at (timestamp)

Messages
├─ id (PK)
├─ sender_id (FK → Users)
├─ recipient_id (FK → Users)
├─ content (text)
├─ sent_at (timestamp)
└─ read (boolean, default false)
```

**Why JSON for responses?**
- Flexible schema (easy to add questions)
- No need for 14 separate columns
- Easy to query with SQLAlchemy

### 5. Authentication Flow

**Simple but Secure:**

```
Signup:
1. User enters email + password
2. Backend validates email domain (McGill/Concordia only)
3. Backend hashes password with bcrypt
4. Backend stores user + university in DB
5. Backend returns user_id + university
6. Frontend stores in state, applies theme

Login:
1. User enters email + password
2. Backend finds user by email
3. Backend verifies password hash
4. Backend returns user_id + university
5. Frontend stores in state, applies theme
```

**Security Notes:**
- Passwords hashed with bcrypt (industry standard)
- Emails lowercase normalized
- No plain-text passwords stored
- **Missing (for production):** JWT tokens, session management

### 6. Messaging System

**Architecture:** Polling-based (not WebSockets)

**Why polling?**
- Simpler to implement
- Works with any hosting
- Good enough for roommate matching (not real-time chat)
- Easy to upgrade to WebSockets later

**Polling Intervals:**
```javascript
// Conversations list: 5 seconds
useEffect(() => {
  fetchConversations();
  const interval = setInterval(fetchConversations, 5000);
  return () => clearInterval(interval);
}, []);

// Active chat thread: 3 seconds
useEffect(() => {
  if (selectedUser) {
    const interval = setInterval(() =>
      fetchThread(selectedUser.user_id), 3000);
    return () => clearInterval(interval);
  }
}, [selectedUser]);
```

**Smart Features:**
- Only polls when page is open (cleanup on unmount)
- Marks messages as read when viewing thread
- Shows unread count in navbar
- Sorts conversations by most recent

### 7. Profile Picture System

**Flow:**
```
User uploads → Frontend validates → FormData → Backend → Cloudinary → URL → Database
```

**Cloudinary Transformations:**
```python
transformation=[
    {"width": 400, "height": 400, "crop": "fill", "gravity": "face"},
    {"quality": "auto"},
    {"fetch_format": "auto"}
]
```

**What this does:**
- Resizes to 400x400 (consistent size)
- Crops to face if detected (smart cropping)
- Auto-optimizes quality
- Auto-converts format (WebP for modern browsers)

**Result:** Fast loading, professional look, small file sizes

### 8. State Management

**Approach:** React useState (no Redux/Context)

**Why?**
- Simple app with 7 pages
- State doesn't need to be deeply nested
- Easy to understand for beginners
- Can migrate to Context API if needed

**Main State:**
```javascript
const [page, setPage] = useState("landing");       // Current page
const [user, setUser] = useState(null);            // User session
const [selectedMatch, setSelectedMatch] = useState(null); // For messaging
const [unreadCount, setUnreadCount] = useState(0); // Nav badge
```

**Data Fetching:** Direct fetch calls (no React Query yet)

### 9. API Design

**RESTful Endpoints:**
```
POST /api/signup           → Create user
POST /api/login            → Authenticate
GET  /api/profile/{id}     → Get user profile
POST /api/profile/update   → Update bio
POST /api/profile/upload-picture → Upload image
POST /api/questionnaire/submit → Save answers
POST /api/matches/calculate → Run algorithm
GET  /api/matches/{id}     → Get user's matches
POST /api/messages/send    → Send message
GET  /api/messages/conversations/{id} → Get inbox
GET  /api/messages/thread/{id}/{other_id} → Get chat
GET  /api/health           → Health check
```

**Design Choices:**
- RESTful naming (nouns, not verbs)
- Consistent `/api` prefix
- Query params for user_id (simple auth)
- JSON request/response bodies
- Proper HTTP status codes

**Missing (for production):**
- Authentication tokens (JWT)
- Rate limiting
- Pagination for large lists
- Versioning (/api/v1)

## Performance Optimizations

### Frontend
1. **CSS animations** instead of JS (GPU-accelerated)
2. **Conditional rendering** (only render current page)
3. **Optimistic UI** (show message immediately, confirm later)
4. **Image lazy loading** (native browser support)

### Backend
1. **Database indexes** on email, user_id
2. **Efficient queries** (single query per endpoint)
3. **JSON responses** (no over-fetching)
4. **Cloudinary CDN** for images

### Algorithm
1. **O(n) complexity** where n = number of users
2. **Pre-computed matches** (not calculated on-demand)
3. **Threshold filtering** (only store score > 50%)

## Security Considerations

### ✅ Implemented
- Bcrypt password hashing
- Email domain validation
- SQL injection prevention (SQLAlchemy ORM)
- CORS configuration
- Input validation (Pydantic)

### ⚠️ Missing (for production)
- JWT tokens
- CSRF protection
- Rate limiting
- Email verification
- Password reset flow
- HTTPS enforcement
- Session management

## Scalability Path

**Current:** Good for 100-1000 users

**To scale to 10,000+ users:**
1. Migrate to PostgreSQL
2. Add Redis for caching
3. Implement JWT auth
4. Add CDN for static files
5. Load balancer for backend
6. Background jobs for matching (Celery)
7. WebSockets for real-time chat
8. Elasticsearch for search

## Code Quality & Maintainability

### Best Practices Used
- ✅ Type hints (Pydantic schemas)
- ✅ Docstrings on functions
- ✅ Consistent naming (camelCase frontend, snake_case backend)
- ✅ Error handling (try/catch, HTTP exceptions)
- ✅ Environment variables (.env)
- ✅ Database migrations ready (Alembic compatible)

### Could Improve
- Add unit tests (pytest for backend, Jest for frontend)
- Add integration tests
- Add logging (Winston/Pino)
- Add monitoring (Sentry)
- Add API documentation (FastAPI auto-docs)

## Deployment Checklist

### Backend (Railway.app recommended)
- [ ] Add gunicorn to requirements.txt
- [ ] Set environment variables
- [ ] Migrate to PostgreSQL
- [ ] Add health check endpoint
- [ ] Configure auto-restart

### Frontend (Vercel recommended)
- [ ] Update API_BASE to production URL
- [ ] Add error boundary
- [ ] Add loading states
- [ ] Optimize images
- [ ] Add analytics (optional)

### Database
- [ ] Backup strategy
- [ ] Migration plan
- [ ] Monitoring

## What Makes This Implementation Special

1. **Dual-University Support** - First roommate app for McGill AND Concordia
2. **Weighted Matching** - Budget + Location prioritized (user request!)
3. **Beautiful UI** - Professional design with smooth animations
4. **Complete Feature Set** - Profiles, matching, messaging all working
5. **Easy Setup** - SQLite + Vite = zero config
6. **Production-Ready Architecture** - Easy path to scale

## Learning Takeaways

**For Students:**
- Full-stack development (React + FastAPI + SQL)
- Authentication & authorization
- Database design
- REST API design
- State management
- Cloud services (Cloudinary)
- Real-world matching algorithm

**Technologies Mastered:**
- React Hooks (useState, useEffect, useRef)
- FastAPI async/await
- SQLAlchemy ORM
- Pydantic validation
- Vite build tool
- SQLite database
- Cloud image storage

---

This implementation balances simplicity for learning with sophistication for real-world use. It's a solid MVP that can scale! 🚀
