# Backend Code Review: MatchMyRoom API
**Reviewed as: Senior Backend Engineer**  
**Severity: CRITICAL issues found**

---

## 🚨 CRITICAL SECURITY VULNERABILITIES

### 1. **NO AUTHENTICATION/AUTHORIZATION** ⚠️ CRITICAL
**File:** [main.py](main.py#L244) (most endpoints)

**Issue:** All endpoints accept `user_id` as a parameter but never verify the requester's identity. Anyone can:
- Update any user's profile: `POST /api/profile/update?user_id=999`
- Upload pictures for other users: `POST /api/profile/upload-picture?user_id=999`
- Send messages as any user: `POST /api/messages/send?sender_id=999`
- Calculate matches for anyone: `POST /api/matches/calculate?user_id=999`

```python
# VULNERABLE: No auth check!
@app.post("/api/profile/update")
def update_profile(user_id: int, data: ProfileUpdateRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()  # ← Anyone can pass any user_id
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Updates without authentication
```

**Fix:** Implement JWT tokens or session-based auth. On **every** endpoint, verify:
```python
def get_current_user(token: str = Depends(HTTPBearer())) -> int:
    # Validate JWT, extract user_id, return it
    pass

@app.post("/api/profile/update")
def update_profile(
    request_user_id: int = Depends(get_current_user),  # From token
    data: ProfileUpdateRequest,
    db: Session = Depends(get_db)
):
    if request_user_id != data.target_user_id:  # ALWAYS verify
        raise HTTPException(status_code=403, detail="Unauthorized")
```

---

### 2. **NO RATE LIMITING** ⚠️ CRITICAL
**File:** [main.py](main.py#L107)

**Issue:** Attackers can:
- **Brute force passwords:** Try 1000 login attempts per second
- **Email flood:** Request verification codes infinitely, filling user inbox and email quota
- **Spam messages:** Send unlimited messages to users
- **DoS the email service:** Trigger email sends repeatedly

```python
@app.post("/api/login", response_model=AuthResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    # No rate limiting! Try millions of passwords instantly
    if not pwd_context.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
```

**Fix:** Add rate limiting middleware:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/login")
@limiter.limit("5/minute")  # 5 attempts per minute per IP
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    pass
```

---

### 3. **WEAK VERIFICATION CODE** ⚠️ HIGH
**File:** [main.py](main.py#L115)

**Issue:** Uses 6-digit code (1,000,000 possibilities). Can be brute forced:
- Without rate limiting: ~50 requests/sec = cracked in 5 hours
- Expected brute force time: ~500k attempts on average
- No attempt tracking or lockout

```python
verification_code = ''.join(random.choices(string.digits, k=6))  # ← Only 1M combos
```

**Fix:** Use longer codes + rate limiting + attempt tracking:
```python
import secrets
import string

# 10-character alphanumeric = 36^10 = 3.6 trillion possibilities
code = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))

# Add attempt tracking
class VerificationAttempt(Base):
    __tablename__ = "verification_attempts"
    id = Column(Integer, primary_key=True)
    email = Column(String, index=True)
    attempt_count = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
```

---

### 4. **PLAINTEXT PASSWORD IN API RESPONSE** ⚠️ CRITICAL
**File:** [main.py](main.py#L707)

**Issue:** Dev endpoint returns plaintext password in JSON response:
```python
@app.post("/api/dev/create-fake-users")
def create_fake_users(db: Session = Depends(get_db)):
    return {
        "password": password  # ← EXPOSED IN API RESPONSE!
    }
```

This is logged, cached, intercepted by proxies, stored in browser history, etc.

**Fix:** 
1. Remove entirely or make it truly admin-only with actual authentication
2. Never return credentials in responses
3. Use environment variables only

```python
# Instead, store in .env and don't expose
FAKE_USER_PASSWORD = os.getenv("FAKE_USER_PASSWORD")
# Don't return it in response
```

---

### 5. **NO INPUT VALIDATION ON FILE UPLOADS** ⚠️ HIGH
**File:** [main.py](main.py#L256)

**Issue:** Only checks MIME type (easily spoofed), no size validation:
```python
if file.content_type not in ["image/jpeg", "image/png", "image/jpg", "image/webp"]:
    raise HTTPException(status_code=400, detail="Only image files...")

file_content = await file.read()  # ← Could be 1GB file!
```

**Attack:** User uploads 10GB files → DoS, disk full, crashes service

**Fix:**
```python
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@app.post("/api/profile/upload-picture")
async def upload_picture(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large")
    
    # Also validate actual file content, not just extension
    file_content = await file.read(MAX_FILE_SIZE + 1)
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large")
```

---

### 6. **MESSAGE CONTENT NOT SANITIZED** ⚠️ MEDIUM
**File:** [main.py](main.py#L510), [schemas.py](schemas.py#L72)

**Issue:** Message content stored and returned as-is. If displayed in HTML without escaping:
```javascript
// If message content contains: <script>alert('XSS')</script>
// And frontend renders without escaping:
<div>{message.content}</div>  // ← XSS vulnerability
```

**Fix:** 
- Frontend: Always escape/sanitize before rendering (`textContent` not `innerHTML`)
- Backend: Validate message length (no length limit currently!)

```python
class MessageSendRequest(BaseModel):
    recipient_id: int
    content: str
    
    @field_validator('content')
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        if len(v) > 5000:
            raise ValueError("Message too long")
        return v.strip()
```

---

### 7. **NO USER CAN MESSAGE THEMSELVES** ⚠️ MEDIUM (Logic Bug)
**File:** [main.py](main.py#L491)

**Issue:** No validation prevents user from messaging themselves:
```python
@app.post("/api/messages/send")
def send_message(sender_id: int, data: MessageSendRequest, db: Session = Depends(get_db)):
    # No check for sender_id == recipient_id
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
```

This creates confusing conversations and wastes database space.

**Fix:**
```python
if sender_id == data.recipient_id:
    raise HTTPException(status_code=400, detail="Cannot message yourself")
```

---

### 8. **CORS CONFIGURATION** ⚠️ MEDIUM
**File:** [main.py](main.py#L38)

**Issue:** Multiple localhost origins with credentials allowed is suspicious:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174"  # ← Multiple origins
    ],
    allow_credentials=True,  # ← With credentials = vulnerable
    allow_methods=["*"],  # ← Allows ALL methods
    allow_headers=["*"],  # ← Allows ALL headers
)
```

In production, this will allow CSRF attacks if used with `allow_credentials=True`.

**Fix:**
```python
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Explicit
    allow_headers=["Content-Type", "Authorization"],  # Explicit
)
```

---

## 🐛 LOGICAL BUGS

### 9. **QUESTIONNAIRE COMPLETED FLAG NOT AUTO-SET ON UPDATE** ⚠️ MEDIUM
**File:** [main.py](main.py#L307)

**Issue:** Flag only set when creating questionnaire, not updating:
```python
if existing:
    existing.responses = data.responses
    db.commit()  # ← questionnaire_completed NOT updated
    db.refresh(existing)
else:
    questionnaire = QuestionnaireResponse(user_id=user_id, responses=data.responses)
    db.add(questionnaire)
    user.questionnaire_completed = True  # ← Only set here
    db.commit()
```

**Problem:** If user resubmits, flag isn't refreshed. Not affecting current logic much but fragile.

**Fix:**
```python
if existing:
    existing.responses = data.responses
    existing.completed_at = datetime.utcnow()  # Track update time
else:
    questionnaire = QuestionnaireResponse(user_id=user_id, responses=data.responses)
    db.add(questionnaire)

user.questionnaire_completed = True  # Set for BOTH cases
db.commit()
```

---

### 10. **DUPLICATE MATCHES CAN EXIST** ⚠️ MEDIUM
**File:** [main.py](main.py#L368)

**Issue:** Matches can be stored asymmetrically:
- User A calculates matches → creates Match(user1_id=A, user2_id=B)
- User B calculates matches → creates Match(user1_id=B, user2_id=A)

Two separate match records for the same pair!

```python
existing_match = db.query(Match).filter(
    ((Match.user1_id == user_id) & (Match.user2_id == other_user.id)) |
    ((Match.user1_id == other_user.id) & (Match.user2_id == user_id))
).first()
```

This works for matching but wastes storage and is confusing.

**Fix:** Normalize matches (always store with smaller ID first):
```python
user_a_id = min(user_id, other_user.id)
user_b_id = max(user_id, other_user.id)

existing_match = db.query(Match).filter(
    Match.user1_id == user_a_id,
    Match.user2_id == user_b_id
).first()

if not existing_match:
    new_match = Match(
        user1_id=user_a_id,
        user2_id=user_b_id,
        compatibility_score=score
    )
```

---

### 11. **ALL MESSAGES MARKED READ AT ONCE** ⚠️ MEDIUM
**File:** [main.py](main.py#L543)

**Issue:** Viewing message thread marks ALL messages from other user as read:
```python
@app.get("/api/messages/thread/{user_id}/{other_user_id}")
def get_message_thread(user_id: int, other_user_id: int, db: Session = Depends(get_db)):
    messages = db.query(Message).filter(...).order_by(Message.sent_at.asc()).all()
    
    # Mark ALL as read regardless of scroll position
    db.query(Message).filter(
        Message.sender_id == other_user_id,
        Message.recipient_id == user_id,
        Message.read == False
    ).update({"read": True})  # ← Bulk update
```

**Problem:** User loads thread but doesn't scroll to end. Still marks all as read.

**Fix:** Frontend tracks scroll position, backend marks specific messages:
```python
class MarkReadRequest(BaseModel):
    message_ids: List[int]

@app.post("/api/messages/mark-read-batch")
def mark_read_batch(data: MarkReadRequest, db: Session = Depends(get_db)):
    db.query(Message).filter(Message.id.in_(data.message_ids)).update({"read": True})
    db.commit()
```

---

### 12. **NO VALIDATION ON MESSAGE CONTENT** ⚠️ MEDIUM
**File:** [schemas.py](schemas.py#L72)

**Issue:** Message can be empty or extremely long:
```python
class MessageSendRequest(BaseModel):
    recipient_id: int
    content: str  # ← No validation!
```

Users can send blank messages, messages with just whitespace, or megabyte-long spam.

**Fix:** Add Pydantic validators:
```python
class MessageSendRequest(BaseModel):
    recipient_id: int
    content: str
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Message cannot be empty")
        if len(v) > 10000:
            raise ValueError("Message too long (max 10000 chars)")
        return v.strip()
```

---

## 🗄️ DATABASE ISSUES

### 13. **SQLite IN PRODUCTION** ⚠️ CRITICAL
**File:** [database.py](database.py#L6)

**Issue:** Using SQLite which:
- Locks entire database on writes (no concurrent writes)
- Max connection limit
- Not designed for multi-user apps
- Loses data easily (single file)

```python
DATABASE_URL = "sqlite:///./matchmyroom.db"
```

With even 20 concurrent users, writes will queue and fail.

**Fix:** Use PostgreSQL for production:
```python
database_url = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost/matchmyroom"
)
engine = create_engine(
    database_url,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True  # Check connections before using
)
```

---

### 14. **NO DATABASE INDEXES** ⚠️ HIGH
**File:** [models.py](models.py#L1)

**Issue:** Only email is indexed. But frequent queries:
- Get matches by user_id (no index on Match.user1_id, Match.user2_id)
- Get questionnaire by user_id (no index on QuestionnaireResponse.user_id)
- Get messages by sender/recipient (no indexes)

```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)  # ← Only one
```

**Fix:** Add indexes to all FK and frequently queried fields:
```python
class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user2_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    compatibility_score = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    __table_args__ = (
        Index("ix_match_users", "user1_id", "user2_id"),  # Composite index
    )
```

---

### 15. **VERIFICATION CODES IN MAIN TABLE** ⚠️ MEDIUM
**File:** [models.py](models.py#L17)

**Issue:** Temporary sensitive data stored with permanent user data:
```python
class User(Base):
    verification_code = Column(String, nullable=True)  # ← Temp data
    verification_code_expires = Column(DateTime, nullable=True)
```

- Clutters user table
- No TTL/cleanup mechanism (codes exist forever)
- Mixes concerns

**Fix:** Move to separate table with TTL:
```python
class VerificationCode(Base):
    __tablename__ = "verification_codes"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    code = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, default=0)
```

Then cleanup with a periodic job:
```python
db.query(VerificationCode).filter(
    VerificationCode.expires_at < datetime.utcnow()
).delete()
```

---

### 16. **NO CASCADE DELETE CONFIGURATION** ⚠️ MEDIUM
**File:** [models.py](models.py#L30)

**Issue:** If user deleted, orphaned records remain:
```python
class Match(Base):
    user1_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # ← No cascade
    user2_id = Column(Integer, ForeignKey("users.id"), nullable=False)
```

**Fix:** Add cascade deletes:
```python
user1_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
user2_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
```

---

### 17. **NO SOFT DELETES** ⚠️ MEDIUM
**File:** [models.py](models.py#L1)

**Issue:** Users disappear completely. No audit trail, can't restore, breaks analytics.

**Fix:** Add soft delete to all important tables:
```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    # ... other fields
    deleted_at = Column(DateTime, nullable=True)  # ← Soft delete
    
    @property
    def is_active(self):
        return self.deleted_at is None
```

Then filter queries:
```python
db.query(User).filter(User.deleted_at.is_(None)).all()
```

---

## ⚡ SCALABILITY PROBLEMS

### 18. **N+1 QUERY PROBLEM IN GET MATCHES** ⚠️ HIGH
**File:** [main.py](main.py#L417)

**Issue:** Gets all matches, then for each match does 2 more queries (user lookup + questionnaire):
```python
matches = db.query(Match).filter(...)  # Query 1
for match in matches:
    other_user = db.query(User).filter(...)  # Query N
    other_questionnaire = db.query(QuestionnaireResponse)...  # Query N
```

With 1000 matches = ~2000 database queries!

**Fix:** Use eager loading:
```python
matches = db.query(Match).options(
    joinedload(Match.user1).joinedload(User.questionnaire),
    joinedload(Match.user2).joinedload(User.questionnaire)
).filter(...)
```

Or use explicit joins:
```python
matches = db.query(Match, User, QuestionnaireResponse).join(
    User, (Match.user2_id == User.id)
).outerjoin(
    QuestionnaireResponse, (User.id == QuestionnaireResponse.user_id)
).filter(...)
```

---

### 19. **FULL TABLE SCAN IN CALCULATE MATCHES** ⚠️ HIGH
**File:** [main.py](main.py#L341)

**Issue:** Fetches ALL users then filters in memory:
```python
other_users = db.query(User).filter(
    User.id != user_id,
    User.questionnaire_completed == True
).all()  # ← Loads ALL users into memory
```

With 100k users = ~10MB in memory per calculation.

**Fix:** Keep in database query:
```python
other_users = db.query(User).filter(
    User.id != user_id,
    User.questionnaire_completed == True
).all()  # Already filtered at DB level, but consider pagination
```

Also: This loops through one-by-one. Better with batch operations.

---

### 20. **RECALCULATING ALL MATCHES REPEATEDLY** ⚠️ HIGH
**File:** [main.py](main.py#L341)

**Issue:** `/api/matches/calculate` recalculates against all ~1000s of users every time:
```python
@app.post("/api/matches/calculate")
def calculate_matches(user_id: int, db: Session = Depends(get_db)):
    other_users = db.query(User)...  # ← 1000s of loops
    for other_user in other_users:
        score = calculate_compatibility(...)  # O(1) but done 1000s of times
```

If user calls this weekly = 1000s of unnecessary calculations.

**Fix:** 
1. Calculate once on questionnaire submit
2. Store scores in database
3. Update scores when OTHER users submit
4. Consider batch job to recalculate weekly

```python
@app.post("/api/questionnaire/submit")
def submit_questionnaire(user_id: int, data: QuestionnaireSubmit, db: Session = Depends(get_db)):
    # ... save questionnaire
    # Then calculate matches in background job (not in request)
    background_tasks.add_task(calculate_all_matches_for_user, user_id)
```

---

### 21. **NO PAGINATION ON MATCH RESULTS** ⚠️ HIGH
**File:** [main.py](main.py#L426)

**Issue:** Returns ALL matches without pagination:
```python
@app.get("/api/matches/{user_id}", response_model=List[MatchResponse])
def get_matches(user_id: int, db: Session = Depends(get_db)):
    matches = db.query(Match).filter(...).all()  # ← ALL matches at once
    return [...]  # ← Serializes everything
```

With 1000 matches = ~1MB JSON response per request.

**Fix:** Add pagination:
```python
@app.get("/api/matches/{user_id}")
def get_matches(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    matches = db.query(Match).filter(...).offset(skip).limit(limit).all()
    total = db.query(Match).filter(...).count()
    return {
        "data": [MatchResponse(...) for m in matches],
        "total": total,
        "skip": skip,
        "limit": limit
    }
```

---

### 22. **EMAIL NOTIFICATIONS CAN SPAM USERS** ⚠️ MEDIUM
**File:** [main.py](main.py#L385)

**Issue:** `notify_users_with_new_matches` sends email to EVERY user with matches:
```python
def notify_users_with_new_matches(db: Session, new_user_id: int):
    all_users = db.query(User)...  # Get all 1000 users
    for user in all_users:
        if match_count > 0:
            send_new_matches_notification(...)  # Send to each
```

Every time someone completes questionnaire, 1000 emails sent!

**Fix:** 
1. Track which users have been notified recently
2. Add email preference table
3. Batch notifications (daily digest)

```python
class UserEmailPreference(Base):
    __tablename__ = "user_email_preferences"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    last_match_notification = Column(DateTime, nullable=True)
    min_hours_between_notifications = Column(Integer, default=24)
```

---

### 23. **NO DATABASE CONNECTION POOLING CONFIG** ⚠️ MEDIUM
**File:** [database.py](database.py#L6)

**Issue:** SQLite doesn't support proper pooling, but code doesn't config it:
```python
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # ← Hacky workaround
)
```

Once migrated to PostgreSQL, needs pooling config.

**Fix:**
```python
from sqlalchemy.pool import NullPool

engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool if is_serverless else QueuePool,
    pool_size=20,
    max_overflow=10,
    pool_recycle=3600,
    pool_pre_ping=True
)
```

---

### 24. **NO CACHING** ⚠️ MEDIUM
**File:** [main.py](main.py#L246)

**Issue:** Profile data fetched from database every request:
```python
@app.get("/api/profile/{user_id}")
def get_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User)...  # ← DB hit every time
```

Handle with cache (Redis):
```python
from functools import lru_cache
from redis import Redis

cache = Redis(host='localhost', port=6379, db=0)

@app.get("/api/profile/{user_id}")
def get_profile(user_id: int, db: Session = Depends(get_db)):
    cached = cache.get(f"profile:{user_id}")
    if cached:
        return json.loads(cached)
    
    user = db.query(User)...
    cache.setex(f"profile:{user_id}", 3600, json.dumps(...))  # 1 hour TTL
    return user
```

---

## 🔧 EDGE CASES

### 25. **CRASH ON USER WITH NO FIRST NAME** ⚠️ MEDIUM
**File:** [main.py](main.py#L134)

**Issue:** If name is empty/whitespace:
```python
first_name = data.name.split()[0] if data.name else "there"
# If name = "   " (spaces), split() returns [], crashes with IndexError
```

**Fix:**
```python
parts = data.name.split() if data.name else []
first_name = parts[0] if parts else "there"
```

Or validate in schema:
```python
class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, regex=r"^\S+")  # At least one word
```

---

### 26. **NO VALIDATION ON NAME/BIO/PROGRAM LENGTH** ⚠️ MEDIUM
**File:** [models.py](models.py#L1), [main.py](main.py#L267)

**Issue:** Only bio has length check. Name and program are unbounded:
```python
class User(Base):
    name = Column(String, nullable=False)  # ← No limit
    program = Column(String, nullable=True)  # ← No limit
    bio = Column(Text, nullable=True)  # ← Limited to 500 in endpoint
```

User could upload 1MB+ names, breaking UI and wasting storage.

**Fix:**
```python
class User(Base):
    name = Column(String(200), nullable=False)
    program = Column(String(100), nullable=True)
    bio = Column(String(500), nullable=True)
```

And in schemas:
```python
class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
```

---

### 27. **DEPRECATED datetime.utcnow()** ⚠️ LOW
**File:** [main.py](main.py#L116) and throughout

**Issue:** Using deprecated `datetime.utcnow()`:
```python
code_expires = datetime.utcnow() + timedelta(minutes=15)
```

**Fix:** Use modern approach:
```python
from datetime import datetime, timezone, timedelta

code_expires = datetime.now(timezone.utc) + timedelta(minutes=15)
```

---

### 28. **NO DELETE ENDPOINT FOR USERS** ⚠️ MEDIUM
**File:** [main.py](main.py#L1)

**Issue:** No way to delete account. GDPR violation (right to be forgotten).

**Fix:** Add delete endpoint:
```python
@app.delete("/api/users/{user_id}")
def delete_user(
    user_id: int,
    current_user_id: int = Depends(get_current_user),  # Must be authenticated
    db: Session = Depends(get_db)
):
    if current_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Soft delete (privacy-friendly)
    user.deleted_at = datetime.now(timezone.utc)
    db.commit()
    
    # Or hard delete (GDPR compliance)
    # db.delete(user)
    # db.commit()
    
    return {"message": "Account deleted"}
```

---

### 29. **OLD PROFILE PICTURES NOT CLEANED UP** ⚠️ MEDIUM
**File:** [main.py](main.py#L256)

**Issue:** When user uploads new picture, old one stays in Cloudinary:
```python
user.profile_pic_url = picture_url  # ← Old file orphaned
```

Wasted storage costs.

**Fix:**
```python
async def upload_picture(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(User)...
    
    # Delete old picture if exists
    if user.profile_pic_url:
        delete_profile_picture(user_id)  # Already has this function!
    
    picture_url = await upload_profile_picture(file_content, user.id)
    user.profile_pic_url = picture_url
```

---

### 30. **NO VALIDATION FOR DUPLICATE MATCH NOTIFICATIONS** ⚠️ MEDIUM
**File:** [main.py](main.py#L385)

**Issue:** User can receive multiple emails for same match:
```python
def notify_users_with_new_matches(db: Session, new_user_id: int):
    for user in all_users:
        match_count = db.query(Match).count()  # ← Includes old matches!
        send_new_matches_notification(...)  # ← Notified again
```

**Fix:** Track notifications:
```python
class MatchNotification(Base):
    __tablename__ = "match_notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), index=True)
    notified_at = Column(DateTime, default=datetime.utcnow)
```

Only notify about NEW matches.

---

## 🎯 SUMMARY TABLE

| Issue | Severity | Category | Fix Effort |
|-------|----------|----------|-----------|
| No Authentication | CRITICAL | Security | High |
| No Rate Limiting | CRITICAL | Security | High |
| Plaintext Password in Response | CRITICAL | Security | Low |
| SQLite in Production | CRITICAL | Database | High |
| No File Size Validation | HIGH | Security | Low |
| Weak Verification Code | HIGH | Security | Medium |
| N+1 Queries | HIGH | Performance | High |
| Full Table Scans | HIGH | Performance | Medium |
| No Pagination | HIGH | Performance | Medium |
| Duplicate Matches | MEDIUM | Logic | Medium |
| No Input Validation | MEDIUM | Security | Medium |
| No Indexes | MEDIUM | Database | Medium |
| Email Spam Risk | MEDIUM | Design | Medium |
| User Self-Messaging | MEDIUM | Logic | Low |
| No Soft Deletes | MEDIUM | Database | High |
| Missing Error Handling | MEDIUM | Code Quality | Low |
| Deprecated datetime | LOW | Code Quality | Low |

---

## 📋 IMMEDIATE ACTIONS (Priority Order)

1. **Add Authentication/Authorization** - Build JWT middleware, secure all endpoints
2. **Add Rate Limiting** - Protect login, email, messages
3. **Migrate from SQLite to PostgreSQL** - Critical for production
4. **Add Database Indexes** - Massive performance gain
5. **Implement Input Validation** - Add Pydantic validators, file size checks
6. **Add Pagination** - Prevent memory exhaustion
7. **Fix Query N+1 Problems** - Use eager loading
8. **Implement Soft Deletes** - Better data management
9. **Add Logging/Monitoring** - Debug issues in production
10. **Setup CI/CD with automated tests** - Catch issues early

---

**Overall Assessment:** Code works for MVP but **DANGEROUS for production**. Security flaws alone could lead to account takeovers, DoS attacks, and data breaches. Fix authentication/authorization and rate limiting immediately.
