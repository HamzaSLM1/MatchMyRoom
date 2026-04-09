from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Request, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload
from passlib.context import CryptContext
from typing import List, Optional
import os
import secrets
import string
import jwt
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime, timedelta, timezone
import threading
import anthropic

from .database import get_db, init_db
from .models import User, QuestionnaireResponse, Match, Message, Like, PasswordResetToken, Block, Report
from .schemas import (
    SignupRequest, LoginRequest, AuthResponse,
    ProfileUpdateRequest, UserProfile,
    QuestionnaireSubmit,
    MatchResponse,
    MessageSendRequest, MessageResponse, ConversationPreview,
    VerifyEmailRequest, VerifyEmailResponse, ResendCodeRequest,
    SwipeRequest, SwipeResponse, SwipeHistoryItem, SendInitialMessageRequest,
    ForgotPasswordRequest, ResetPasswordRequest, BlockRequest, ReportRequest
)
from .matching import calculate_compatibility, calculate_compatibility_breakdown, get_question_text
from .cloudinary_config import init_cloudinary, upload_profile_picture, delete_profile_picture
from .email_service import send_new_matches_notification, send_welcome_email, send_verification_code, send_like_notification, send_mutual_match_notification, send_email
from .utils import get_blocked_user_ids

# Load environment variables
load_dotenv()

# ─── Configuration ───
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is required. "
        "Set it in your .env file. Use: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_VERIFICATION_ATTEMPTS = 5
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173"
).split(",")

# Agent 2 env vars
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Initialize FastAPI app
app = FastAPI(
    title="MatchMyRoom API",
    description="McGill & Concordia roommate matching platform API",
    version="2.0.0"
)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token scheme
security = HTTPBearer(auto_error=False)


# ─── WebSocket Connection Manager ───
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)

    async def send_to_user(self, user_id: int, message: dict) -> bool:
        ws = self.active_connections.get(user_id)
        if ws:
            await ws.send_json(message)
            return True
        return False


ws_manager = ConnectionManager()


# ─── JWT Helpers ───
def create_token(user_id: int, email: str) -> str:
    """Create a JWT token for authenticated user"""
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Verify JWT token and return current user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Try to get user from token, return None if not authenticated"""
    if not credentials:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


# ─── Startup Event ───
@app.on_event("startup")
def startup_event():
    """Initialize database and Cloudinary on startup"""
    try:
        init_db()
        print("✅ Database initialized")
    except Exception as e:
        print(f"❌ Database init failed: {e}")
        # Tables will be created on first request via create_all fallback
        try:
            from .models import Base
            from .database import engine
            Base.metadata.create_all(bind=engine)
            print("✅ Tables created via emergency create_all")
        except Exception as e2:
            print(f"❌ Emergency create_all also failed: {e2}")
    # Ensure any missing columns are added (safe to run on every startup)
    try:
        from sqlalchemy import text
        from .database import engine
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS share_token VARCHAR"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP"))
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_share_token ON users (share_token)"))
            conn.commit()
        print("✅ Column migration check complete")
    except Exception as e:
        print(f"⚠️  Column migration check failed: {e}")
    try:
        init_cloudinary()
        print("✅ Cloudinary configured")
    except Exception as e:
        print(f"⚠️  Cloudinary init failed: {e}")
    print(f"✅ CORS origins: {ALLOWED_ORIGINS}")


# ─── Helper Functions ───
def get_university_from_email(email: str) -> str:
    """Determine university from email domain"""
    email_lower = email.lower()
    if "@concordia.ca" in email_lower or "@live.concordia.ca" in email_lower:
        return "concordia"
    return "mcgill"


def validate_university_email(email: str) -> bool:
    """Check if email is from McGill or Concordia"""
    email_lower = email.lower()
    return (
        email_lower.endswith("@mcgill.ca") or
        email_lower.endswith("@mail.mcgill.ca") or
        email_lower.endswith("@concordia.ca") or
        email_lower.endswith("@live.concordia.ca")
    )


def generate_verification_code() -> str:
    """Generate a secure 6-digit verification code"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))


# ─── Auth Endpoints (Public - rate limited) ───
@app.post("/api/signup", response_model=AuthResponse)
@limiter.limit("5/minute")
def signup(request: Request, data: SignupRequest, db: Session = Depends(get_db)):
    """Create a new user account"""
    import traceback
    try:
        return _signup_impl(request, data, db)
    except HTTPException:
        raise
    except Exception as e:
        print(f"SIGNUP ERROR: {traceback.format_exc()}", flush=True)
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")

def _signup_impl(request: Request, data: SignupRequest, db: Session):
    email = data.email.lower()

    # Validate university email
    if not validate_university_email(email):
        raise HTTPException(
            status_code=400,
            detail="Only McGill or Concordia student emails are allowed"
        )

    # Check for duplicate email
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password
    hashed_password = pwd_context.hash(data.password)

    # Determine university
    university = get_university_from_email(email)

    # Generate verification code
    verification_code = generate_verification_code()
    code_expires = datetime.now(timezone.utc) + timedelta(minutes=15)

    new_user = User(
        name=data.name.strip(),
        email=email,
        password_hash=hashed_password,
        university=university,
        email_verified=False,
        verification_code=verification_code,
        verification_code_expires=code_expires,
        verification_attempts=0,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send verification email in background (non-blocking)
    parts = data.name.split() if data.name else []
    first_name = parts[0] if parts else "there"
    threading.Thread(
        target=lambda: send_verification_code(email, first_name, verification_code),
        daemon=True,
    ).start()

    is_dev = os.getenv("ENV", "development") != "production"
    return AuthResponse(
        message="Account created! Check your email for a verification code.",
        user_id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        university=new_user.university,
        questionnaire_completed=False,
        token="",  # no token until verified
        dev_code=verification_code if is_dev else None,
    )


@app.post("/api/login", response_model=AuthResponse)
@limiter.limit("10/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token"""
    email = data.email.lower()

    # Find user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Verify password
    if not pwd_context.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check email verified
    if not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email first. Check your inbox for the verification code.",
        )

    # Generate JWT token
    token = create_token(user.id, user.email)

    return AuthResponse(
        message="Login successful",
        user_id=user.id,
        email=user.email,
        name=user.name,
        university=user.university,
        questionnaire_completed=user.questionnaire_completed,
        token=token
    )


# ─── Email Verification Endpoints (Public - rate limited) ───
@app.post("/api/verify-email", response_model=VerifyEmailResponse)
@limiter.limit("10/minute")
def verify_email(request: Request, data: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify user email with the code sent to their inbox"""
    email = data.email.lower()

    # Find user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already verified
    if user.email_verified:
        return VerifyEmailResponse(message="Email already verified", email_verified=True)

    # Check attempt limit
    if user.verification_attempts >= MAX_VERIFICATION_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many verification attempts. Please request a new code."
        )

    # Check if code exists
    if not user.verification_code:
        raise HTTPException(status_code=400, detail="No verification code found. Please request a new one.")

    # Check if code has expired (handle both naive and aware datetimes from DB)
    if user.verification_code_expires:
        expires = user.verification_code_expires
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")

    # Increment attempt counter
    user.verification_attempts += 1

    # Verify code
    if user.verification_code != data.code:
        db.commit()
        remaining = MAX_VERIFICATION_ATTEMPTS - user.verification_attempts
        raise HTTPException(
            status_code=400,
            detail=f"Invalid verification code. {remaining} attempts remaining."
        )

    # Mark email as verified
    user.email_verified = True
    user.verification_code = None
    user.verification_code_expires = None
    user.verification_attempts = 0
    db.commit()

    return VerifyEmailResponse(message="Email verified successfully! You can now log in.", email_verified=True)


@app.post("/api/resend-verification-code")
@limiter.limit("3/minute")
def resend_verification_code(request: Request, data: ResendCodeRequest, db: Session = Depends(get_db)):
    """Resend verification code to user's email"""
    email = data.email.lower()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    # Generate new code and reset attempts
    verification_code = generate_verification_code()
    code_expires = datetime.now(timezone.utc) + timedelta(minutes=15)

    user.verification_code = verification_code
    user.verification_code_expires = code_expires
    user.verification_attempts = 0
    db.commit()

    parts = user.name.split() if user.name else []
    first_name = parts[0] if parts else "there"
    threading.Thread(
        target=lambda: send_verification_code(email, first_name, verification_code),
        daemon=True
    ).start()

    is_dev = os.getenv("ENV", "development") != "production"
    return {
        "message": "Verification code sent! Check your inbox.",
        "dev_code": verification_code if is_dev else None
    }


# ─── Dev: Test Email ───
@app.get("/api/dev/test-email")
def test_email(to: str):
    """Test email sending — dev only"""
    if os.getenv("ENV", "development") == "production":
        raise HTTPException(status_code=403, detail="Disabled in production")
    from .email_service import send_email, RESEND_API_KEY, SMTP_USERNAME, SMTP_PASSWORD, FROM_EMAIL, SMTP_HOST, SMTP_PORT
    config = {
        "RESEND_API_KEY": "set" if RESEND_API_KEY else "NOT SET",
        "SMTP_USERNAME": SMTP_USERNAME or "NOT SET",
        "SMTP_HOST": SMTP_HOST,
        "SMTP_PORT": SMTP_PORT,
        "FROM_EMAIL": FROM_EMAIL,
    }
    result = send_email(to, "MatchMyRoom Test Email", "<p>Test email from MatchMyRoom. If you see this, email is working!</p>")
    return {"sent": result, "config": config}


# ─── Profile Endpoints (Authenticated) ───

# Feature 12: Public profile endpoint — no auth required.
# IMPORTANT: this must be declared BEFORE /api/profile/{user_id} so FastAPI
# does not interpret the literal string "public" as a user_id integer.
@app.get("/api/profile/public/{share_token}")
def get_public_profile(share_token: str, db: Session = Depends(get_db)):
    """Get a public profile by share token — no auth required"""
    user = db.query(User).filter(User.share_token == share_token).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")

    return {
        "first_name": user.name.split()[0] if user.name else "",
        "last_name": " ".join(user.name.split()[1:]) if user.name and len(user.name.split()) > 1 else "",
        "university": user.university,
        "bio": user.bio,
        "profile_pic_url": user.profile_pic_url,
        "share_token": user.share_token,
    }


# Feature 12: Share token endpoint — authenticated, own profile only.
# Also declared before /{user_id} to avoid route conflicts.
@app.get("/api/profile/{user_id}/share-token")
def get_share_token(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get or generate a shareable profile token for the user"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot get share token for another user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.share_token:
        user.share_token = secrets.token_urlsafe(9)  # ~12 chars
        db.commit()

    return {"share_token": user.share_token, "share_url": f"/profile/share/{user.share_token}"}


@app.get("/api/profile/{user_id}", response_model=UserProfile)
def get_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user profile by ID — must be authenticated"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Feature 3: compute is_online — True when last_seen is None AND user has an active WS connection
    is_online = (user.last_seen is None) and (user.id in ws_manager.active_connections)

    return UserProfile(
        id=user.id,
        name=user.name,
        email=user.email,
        university=user.university,
        program=user.program,
        bio=user.bio,
        profile_pic_url=user.profile_pic_url,
        social_links=user.social_links,
        questionnaire_completed=user.questionnaire_completed,
        created_at=user.created_at,
        last_seen=user.last_seen,
        is_online=is_online,
    )


@app.post("/api/profile/update")
def update_profile(
    user_id: int,
    data: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user profile (bio) - must be own profile"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot update another user's profile")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.bio is not None:
        user.bio = data.bio
    if data.social_links is not None:
        user.social_links = data.social_links

    db.commit()
    db.refresh(user)

    return {"message": "Profile updated successfully"}


@app.post("/api/profile/upload-picture")
@limiter.limit("3/minute")
async def upload_picture(
    request: Request,
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload profile picture to Cloudinary - must be own profile"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot upload picture for another user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate MIME type — strict allowlist per spec
    ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")

    # Read file content with size limit
    file_content = await file.read(MAX_FILE_SIZE + 1)
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")

    # Delete old picture if exists
    if user.profile_pic_url:
        delete_profile_picture(user.id)

    # Upload to Cloudinary
    picture_url, rejection_reason = await upload_profile_picture(file_content, user.id)

    if rejection_reason == "rejected":
        raise HTTPException(status_code=400, detail="Image was rejected by content moderation. Please upload an appropriate profile photo.")
    if not picture_url:
        raise HTTPException(status_code=500, detail="Failed to upload image to Cloudinary")

    # Update user profile
    user.profile_pic_url = picture_url
    db.commit()
    db.refresh(user)

    return {"message": "Profile picture uploaded successfully", "url": picture_url}


# ─── Private helper: recalculate matches without sending emails (Feature 15) ───
def _recalculate_matches_for_user(user_id: int, db: Session) -> None:
    """Recalculate all match scores for a user — silent, no emails, no notifications."""
    user_questionnaire = db.query(QuestionnaireResponse).filter(
        QuestionnaireResponse.user_id == user_id
    ).first()
    if not user_questionnaire:
        return

    # Cap at 500 to prevent OOM on large datasets (mirrors calculate_matches endpoint)
    other_users = db.query(User).options(
        joinedload(User.questionnaire)
    ).filter(
        User.id != user_id,
        User.questionnaire_completed == True
    ).limit(500).all()

    for other_user in other_users:
        if not other_user.questionnaire:
            continue

        score = calculate_compatibility(
            user_questionnaire.responses,
            other_user.questionnaire.responses
        )

        if score > 50:
            # Skip if either user has blocked the other
            blocked_ids = get_blocked_user_ids(user_id, db)
            if other_user.id in blocked_ids:
                continue

            user_a_id = min(user_id, other_user.id)
            user_b_id = max(user_id, other_user.id)

            existing_match = db.query(Match).filter(
                Match.user1_id == user_a_id,
                Match.user2_id == user_b_id
            ).first()

            if existing_match:
                existing_match.compatibility_score = score
            else:
                new_match = Match(
                    user1_id=user_a_id,
                    user2_id=user_b_id,
                    compatibility_score=score
                )
                db.add(new_match)

    db.commit()


# ─── Questionnaire Endpoints (Authenticated) ───
@app.post("/api/questionnaire/submit")
def submit_questionnaire(
    user_id: int,
    data: QuestionnaireSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit or update questionnaire responses"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot submit questionnaire for another user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if questionnaire already exists
    existing = db.query(QuestionnaireResponse).filter(
        QuestionnaireResponse.user_id == user_id
    ).first()

    if existing:
        existing.responses = data.responses
        existing.completed_at = datetime.now(timezone.utc)
    else:
        questionnaire = QuestionnaireResponse(
            user_id=user_id,
            responses=data.responses
        )
        db.add(questionnaire)

    # Always ensure flag is set
    user.questionnaire_completed = True
    db.commit()

    # Feature 15: If this is a retake, silently recalculate matches (no emails)
    if existing:
        _recalculate_matches_for_user(user_id, db)

    return {"message": "Questionnaire submitted successfully"}


# ─── Matching Endpoints ───
@app.post("/api/matches/calculate")
@limiter.limit("5/minute")
def calculate_matches(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate and store matches for a user"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot calculate matches for another user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get user's questionnaire
    user_questionnaire = db.query(QuestionnaireResponse).filter(
        QuestionnaireResponse.user_id == user_id
    ).first()

    if not user_questionnaire:
        raise HTTPException(status_code=400, detail="Please complete the questionnaire first")

    # Get other users with completed questionnaires (eager load questionnaires)
    # Capped at 500 to prevent OOM on large datasets
    other_users = db.query(User).options(
        joinedload(User.questionnaire)
    ).filter(
        User.id != user_id,
        User.questionnaire_completed == True
    ).limit(500).all()

    # Calculate compatibility scores
    matches_created = 0
    for other_user in other_users:
        if not other_user.questionnaire:
            continue

        # Calculate compatibility
        score = calculate_compatibility(
            user_questionnaire.responses,
            other_user.questionnaire.responses
        )

        # Only store matches with score > 50%
        if score > 50:
            # Block check: do not write a match if either user has blocked the other.
            # Existing matches are hidden at the API layer (not deleted) when a block is created;
            # this check only prevents new match rows from being written.
            blocked_ids = get_blocked_user_ids(user_id, db)
            if other_user.id in blocked_ids:
                continue

            # Normalize match: always store smaller user_id first
            user_a_id = min(user_id, other_user.id)
            user_b_id = max(user_id, other_user.id)

            existing_match = db.query(Match).filter(
                Match.user1_id == user_a_id,
                Match.user2_id == user_b_id
            ).first()

            if existing_match:
                existing_match.compatibility_score = score
            else:
                new_match = Match(
                    user1_id=user_a_id,
                    user2_id=user_b_id,
                    compatibility_score=score
                )
                db.add(new_match)
                matches_created += 1

    db.commit()

    return {"message": "Matches calculated successfully", "matches_found": matches_created}


@app.get("/api/matches/{user_id}", response_model=List[MatchResponse])
def get_matches(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all matches for a user, sorted by compatibility score (paginated)"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot view another user's matches")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get the set of blocked user IDs (bidirectional) to filter out from results.
    # Note: existing match rows are NOT deleted when a block is created — they are
    # hidden here at the API layer. If the block is later removed, matches reappear.
    blocked_ids = get_blocked_user_ids(user_id, db)

    # Get matches with eager loading to avoid N+1
    matches = db.query(Match).filter(
        (Match.user1_id == user_id) | (Match.user2_id == user_id)
    ).order_by(Match.compatibility_score.desc()).offset(skip).limit(limit).all()

    result = []
    # Batch load all other user ids, excluding blocked users
    other_user_ids = []
    for match in matches:
        other_id = match.user2_id if match.user1_id == user_id else match.user1_id
        if other_id not in blocked_ids:
            other_user_ids.append(other_id)

    # Load all users and questionnaires in one query each
    users_map = {}
    questionnaire_map = {}
    if other_user_ids:
        other_users = db.query(User).filter(User.id.in_(other_user_ids)).all()
        users_map = {u.id: u for u in other_users}

        questionnaires = db.query(QuestionnaireResponse).filter(
            QuestionnaireResponse.user_id.in_(other_user_ids)
        ).all()
        questionnaire_map = {q.user_id: q for q in questionnaires}

    for match in matches:
        other_user_id = match.user2_id if match.user1_id == user_id else match.user1_id
        # Skip blocked users (bidirectional)
        if other_user_id in blocked_ids:
            continue
        other_user = users_map.get(other_user_id)

        if not other_user:
            continue

        other_questionnaire = questionnaire_map.get(other_user_id)

        gender = area = budget = None
        has_apartment = None
        spots_available = apartment_available = apartment_rooms = None
        if other_questionnaire:
            responses = other_questionnaire.responses
            has_apartment = responses.get("hasApartment") == 0
            gender = get_question_text("gender", responses.get("gender", 0))
            if has_apartment:
                # Show apartment's location and rent instead of preferences
                area = get_question_text("apartmentLocation", responses.get("apartmentLocation"))
                budget = get_question_text("apartmentRent", responses.get("apartmentRent"))
                spots_available = get_question_text("spotsAvailable", responses.get("spotsAvailable"))
                apartment_available = get_question_text("apartmentAvailable", responses.get("apartmentAvailable"))
                apartment_rooms = get_question_text("apartmentRooms", responses.get("apartmentRooms"))
            else:
                area = get_question_text("location", responses.get("location", 0))
                budget = get_question_text("budget", responses.get("budget", 0))

        result.append(MatchResponse(
            id=match.id,
            user_id=other_user.id,
            name=other_user.name,
            program=other_user.program,
            university=other_user.university,
            compatibility_score=match.compatibility_score,
            profile_pic_url=other_user.profile_pic_url,
            bio=other_user.bio,
            gender=gender,
            area=area,
            budget=budget,
            social_links=other_user.social_links or {},
            has_apartment=has_apartment,
            spots_available=spots_available,
            apartment_available=apartment_available,
            apartment_rooms=apartment_rooms,
        ))

    return result


# ─── Feature 22: AI Match Explanation ───
@app.get("/api/matches/explain/{user_id}/{other_user_id}")
@limiter.limit("10/minute")
def explain_match(
    request: Request,
    user_id: int,
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate an AI-powered natural language explanation of why two users match"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Get both users and their questionnaires
    user = db.query(User).filter(User.id == user_id).first()
    other_user = db.query(User).filter(User.id == other_user_id).first()
    if not user or not other_user:
        raise HTTPException(status_code=404, detail="User not found")

    user_q = db.query(QuestionnaireResponse).filter(QuestionnaireResponse.user_id == user_id).first()
    other_q = db.query(QuestionnaireResponse).filter(QuestionnaireResponse.user_id == other_user_id).first()
    if not user_q or not other_q:
        raise HTTPException(status_code=400, detail="Both users must have completed questionnaires")

    # Check that the match actually exists
    user_a_id = min(user_id, other_user_id)
    user_b_id = max(user_id, other_user_id)
    match = db.query(Match).filter(
        Match.user1_id == user_a_id,
        Match.user2_id == user_b_id
    ).first()
    if not match:
        raise HTTPException(status_code=404, detail="No match found between these users")

    # Build the prompt with questionnaire data
    def format_responses(responses: dict) -> str:
        lines = []
        for key, value in responses.items():
            label = get_question_text(key)
            if label:
                lines.append(f"- {label}: {value}")
        return "\n".join(lines) if lines else "No responses"

    user_prefs = format_responses(user_q.responses)
    other_prefs = format_responses(other_q.responses)

    parts_a = user.name.split() if user.name else []
    first_name_a = parts_a[0] if parts_a else "User A"
    parts_b = other_user.name.split() if other_user.name else []
    first_name_b = parts_b[0] if parts_b else "User B"

    prompt = f"""You are a friendly roommate matching assistant for Montreal university students.

Two students matched with a {match.compatibility_score:.0f}% compatibility score. Write a warm, concise 2-3 sentence explanation of why they're a good match and what their main difference is (if any). Be specific — reference their actual preferences. Be encouraging but honest.

{first_name_a}'s preferences:
{user_prefs}

{first_name_b}'s preferences:
{other_prefs}

Write the explanation directly (no preamble like "Here is..." or "Based on..."). Start with what they have in common."""

    try:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise HTTPException(status_code=503, detail="AI explanations not configured")

        ai_client = anthropic.Anthropic(api_key=api_key)
        response = ai_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )
        explanation = response.content[0].text
        return {"explanation": explanation, "compatibility_score": match.compatibility_score}
    except anthropic.APIError as e:
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable")



# ─── Compatibility Breakdown ───
@app.get("/api/matches/breakdown/{user_id}/{other_user_id}")
@limiter.limit("30/minute")
def get_match_breakdown(
    request: Request,
    user_id: int,
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return per-category compatibility breakdown between two users."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    user_q = db.query(QuestionnaireResponse).filter(QuestionnaireResponse.user_id == user_id).first()
    other_q = db.query(QuestionnaireResponse).filter(QuestionnaireResponse.user_id == other_user_id).first()
    if not user_q or not other_q:
        raise HTTPException(status_code=400, detail="Both users must have completed questionnaires")

    return calculate_compatibility_breakdown(user_q.responses, other_q.responses)


# ─── Swipe/Like Endpoints (Authenticated) ───
@app.post("/api/swipes/like", response_model=SwipeResponse)
@limiter.limit("60/minute")
def swipe_like(
    request: Request,
    user_id: int,
    data: SwipeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Handle a swipe (like or pass) on a user.
    If it's a right swipe (like) and the other user has already liked back, it's a mutual match.
    """
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot swipe as another user")

    # Prevent self-swiping
    if user_id == data.liked_user_id:
        raise HTTPException(status_code=400, detail="Cannot swipe on yourself")

    # Verify the liked user exists
    liked_user = db.query(User).filter(User.id == data.liked_user_id).first()
    if not liked_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already swiped on this user
    existing_like = db.query(Like).filter(
        Like.user_id == user_id,
        Like.liked_user_id == data.liked_user_id
    ).first()

    if existing_like:
        raise HTTPException(status_code=400, detail="You've already swiped on this user")

    # Create the like/pass record
    like = Like(
        user_id=user_id,
        liked_user_id=data.liked_user_id,
        is_like=data.is_like
    )
    db.add(like)
    db.commit()

    # Check for mutual match if it's a right swipe (like)
    is_mutual_match = False
    matcher_name = None

    if data.is_like:
        # Send "someone liked you" email in background
        liked_email = liked_user.email
        liked_first = liked_user.name.split()[0] if liked_user.name else "there"
        liker_full = current_user.name
        threading.Thread(
            target=lambda: send_like_notification(liked_email, liked_first, liker_full),
            daemon=True
        ).start()

        # Check if the other user has also liked this user back
        mutual_like = db.query(Like).filter(
            Like.user_id == data.liked_user_id,
            Like.liked_user_id == user_id,
            Like.is_like == True
        ).first()

        if mutual_like:
            is_mutual_match = True
            matcher_name = current_user.name

            # Send mutual match email in background
            threading.Thread(
                target=lambda: send_mutual_match_notification(liked_email, liked_first, liker_full),
                daemon=True
            ).start()

    return SwipeResponse(
        message="Swipe recorded successfully",
        is_mutual_match=is_mutual_match,
        match_name=matcher_name
    )


@app.get("/api/swipes/check-like/{user_id1}/{user_id2}")
def check_like(
    user_id1: int,
    user_id2: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if user1 has liked user2.
    Used to determine if users can message each other.
    """
    if current_user.id != user_id1:
        raise HTTPException(status_code=403, detail="Cannot check likes for another user")

    like = db.query(Like).filter(
        Like.user_id == user_id1,
        Like.liked_user_id == user_id2,
        Like.is_like == True
    ).first()

    return {"has_liked": like is not None}


@app.get("/api/swipes/history/{user_id}", response_model=List[SwipeHistoryItem])
@limiter.limit("30/minute")
def get_swipe_history(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users this person has liked (swiped right on)"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot view another user's swipes")

    likes = db.query(Like).filter(
        Like.user_id == user_id,
        Like.is_like == True
    ).order_by(Like.created_at.desc()).all()

    liked_user_ids = [l.liked_user_id for l in likes]
    if not liked_user_ids:
        return []

    # Filter out blocked users
    blocked_ids = get_blocked_user_ids(user_id, db)
    liked_user_ids = [uid for uid in liked_user_ids if uid not in blocked_ids]
    if not liked_user_ids:
        return []

    users = db.query(User).filter(User.id.in_(liked_user_ids)).all()
    users_map = {u.id: u for u in users}

    mutual_likes = db.query(Like).filter(
        Like.user_id.in_(liked_user_ids),
        Like.liked_user_id == user_id,
        Like.is_like == True
    ).all()
    mutual_ids = {l.user_id for l in mutual_likes}

    result = []
    for like in likes:
        u = users_map.get(like.liked_user_id)
        if not u:
            continue
        result.append(SwipeHistoryItem(
            user_id=u.id,
            name=u.name,
            university=u.university,
            profile_pic_url=u.profile_pic_url,
            program=u.program,
            is_mutual=like.liked_user_id in mutual_ids,
            swiped_at=like.created_at.isoformat() if like.created_at else None
        ))
    return result


# ─── Messaging Endpoints (Authenticated) ───
@app.post("/api/messages/send")
@limiter.limit("30/minute")
async def send_message(
    request: Request,
    sender_id: int,
    data: MessageSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message to another user"""
    if current_user.id != sender_id:
        raise HTTPException(status_code=403, detail="Cannot send messages as another user")

    # Prevent self-messaging
    if sender_id == data.recipient_id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    # Verify recipient exists
    recipient = db.query(User).filter(User.id == data.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    # Block check: prevent messaging if either user has blocked the other
    blocked_ids = get_blocked_user_ids(sender_id, db)
    if data.recipient_id in blocked_ids:
        raise HTTPException(status_code=403, detail="Cannot send message to this user")

    # Create message
    message = Message(
        sender_id=sender_id,
        recipient_id=data.recipient_id,
        content=data.content[:10000]
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    # Push via WebSocket if recipient is connected
    await ws_manager.send_to_user(data.recipient_id, {
        "type": "new_message",
        "message_id": message.id,
        "sender_id": sender_id,
        "sender_name": current_user.name,
        "content": data.content,
        "sent_at": message.sent_at.isoformat(),
    })

    return {"message": "Message sent successfully", "message_id": message.id}


@app.get("/api/messages/conversations/{user_id}", response_model=List[ConversationPreview])
@limiter.limit("30/minute")
def get_conversations(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all conversations for a user with previews"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot view another user's conversations")

    # Get blocked user IDs (bidirectional) to filter out from threads.
    # Note: existing message rows are NOT deleted when a block is created — they are
    # hidden here at the API layer. If the block is later removed, threads reappear.
    blocked_ids = get_blocked_user_ids(user_id, db)

    # Single query: fetch all messages in the user's conversations (replaces N+1 queries)
    all_messages = db.query(Message).filter(
        (Message.sender_id == user_id) | (Message.recipient_id == user_id)
    ).order_by(Message.sent_at.desc()).all()

    # Build last_message and unread_count maps in Python from the single result set
    last_message_map = {}
    unread_count_map = {}
    for msg in all_messages:
        partner = msg.recipient_id if msg.sender_id == user_id else msg.sender_id
        if partner not in last_message_map:
            last_message_map[partner] = msg  # desc-ordered, so first seen is latest
        if msg.recipient_id == user_id and not msg.read:
            unread_count_map[partner] = unread_count_map.get(partner, 0) + 1

    other_user_ids = set(last_message_map.keys())
    # Filter out blocked users from the conversation list
    other_user_ids = other_user_ids - blocked_ids

    # Batch load users
    other_users = db.query(User).filter(User.id.in_(other_user_ids)).all() if other_user_ids else []
    users_map = {u.id: u for u in other_users}

    conversations = []
    for other_user_id in other_user_ids:
        other_user = users_map.get(other_user_id)
        if not other_user:
            continue

        last_message = last_message_map[other_user_id]
        unread_count = unread_count_map.get(other_user_id, 0)

        conversations.append(ConversationPreview(
            user_id=other_user.id,
            name=other_user.name,
            profile_pic_url=other_user.profile_pic_url,
            last_message=last_message.content[:50] + "..." if len(last_message.content) > 50 else last_message.content,
            last_message_time=last_message.sent_at,
            unread_count=unread_count
        ))

    conversations.sort(key=lambda x: x.last_message_time, reverse=True)
    return conversations


@app.get("/api/messages/thread/{user_id}/{other_user_id}", response_model=List[MessageResponse])
def get_message_thread(
    user_id: int,
    other_user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get paginated messages between two users"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot view another user's messages")

    messages = db.query(Message).filter(
        ((Message.sender_id == user_id) & (Message.recipient_id == other_user_id)) |
        ((Message.sender_id == other_user_id) & (Message.recipient_id == user_id))
    ).order_by(Message.sent_at.desc()).offset(skip).limit(limit).all()
    messages.reverse()  # Show oldest-first within the fetched page

    # Mark messages from other user as read
    db.query(Message).filter(
        Message.sender_id == other_user_id,
        Message.recipient_id == user_id,
        Message.read == False
    ).update({"read": True})
    db.commit()

    return messages


@app.post("/api/messages/mark-read/{message_id}")
def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a message as read — only the recipient can mark it"""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot mark another user's messages as read")

    message.read = True
    db.commit()

    return {"message": "Message marked as read"}


# ─── WebSocket Endpoint ───
@app.websocket("/api/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, token: str = Query(...)):
    """WebSocket endpoint for real-time messaging. Authenticate via token query param."""
    # Validate JWT token
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        token_user_id = payload.get("user_id")
        if token_user_id != user_id:
            await websocket.close(code=4003, reason="User ID mismatch")
            return
    except jwt.ExpiredSignatureError:
        await websocket.close(code=4001, reason="Token expired")
        return
    except jwt.InvalidTokenError:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await ws_manager.connect(user_id, websocket)

    # Feature 3: mark user as currently online (last_seen = None means "online right now")
    _ws_db = next(get_db())
    try:
        db_user = _ws_db.query(User).filter(User.id == user_id).first()
        if db_user:
            db_user.last_seen = None
            _ws_db.commit()
    finally:
        _ws_db.close()

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")

            # Feature 4: typing indicators — forward to recipient, do not persist
            if msg_type == "typing":
                recipient_id = data.get("recipient_id")
                if recipient_id:
                    await ws_manager.send_to_user(recipient_id, {
                        "type": "typing",
                        "sender_id": user_id
                    })
                continue

            elif msg_type == "stop_typing":
                recipient_id = data.get("recipient_id")
                if recipient_id:
                    await ws_manager.send_to_user(recipient_id, {
                        "type": "stop_typing",
                        "sender_id": user_id
                    })
                continue

            # Handle incoming message from WebSocket
            if msg_type == "message":
                recipient_id = data.get("recipient_id")
                content = data.get("content", "").strip()

                if not recipient_id or not content:
                    await websocket.send_json({"type": "error", "detail": "Missing recipient_id or content"})
                    continue

                if recipient_id == user_id:
                    await websocket.send_json({"type": "error", "detail": "Cannot message yourself"})
                    continue

                # Save to database
                db = next(get_db())
                try:
                    recipient = db.query(User).filter(User.id == recipient_id).first()
                    if not recipient:
                        await websocket.send_json({"type": "error", "detail": "Recipient not found"})
                        continue

                    # Block check: prevent messaging if either user has blocked the other
                    blocked_ids = get_blocked_user_ids(user_id, db)
                    if recipient_id in blocked_ids:
                        await websocket.send_json({"type": "error", "detail": "Cannot send message to this user"})
                        continue

                    sender = db.query(User).filter(User.id == user_id).first()
                    message = Message(
                        sender_id=user_id,
                        recipient_id=recipient_id,
                        content=content[:10000]
                    )
                    db.add(message)
                    db.commit()
                    db.refresh(message)

                    msg_payload = {
                        "type": "new_message",
                        "message_id": message.id,
                        "sender_id": user_id,
                        "sender_name": sender.name if sender else "Unknown",
                        "content": content[:10000],
                        "sent_at": message.sent_at.isoformat(),
                    }

                    # Forward to recipient if connected
                    await ws_manager.send_to_user(recipient_id, msg_payload)

                    # Confirm to sender
                    await websocket.send_json({"type": "message_sent", "message_id": message.id})
                finally:
                    db.close()

            elif msg_type == "mark_read":
                message_id = data.get("message_id")
                if message_id:
                    db = next(get_db())
                    try:
                        msg = db.query(Message).filter(Message.id == message_id).first()
                        if msg and msg.recipient_id == user_id:
                            msg.read = True
                            db.commit()
                    finally:
                        db.close()

    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)
        # Feature 3: record when the user went offline
        _ws_db = next(get_db())
        try:
            db_user = _ws_db.query(User).filter(User.id == user_id).first()
            if db_user:
                db_user.last_seen = datetime.now(timezone.utc)
                _ws_db.commit()
        finally:
            _ws_db.close()


# ─── Health Check ───
@app.get("/api/ping")
def ping():
    """Simple health check - no DB"""
    return {"status": "ok"}


@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint with DB"""
    try:
        user_count = db.query(User).count()
        return {
            "status": "ok",
            "users": user_count,
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "error",
            "database": str(e)
        }


# ─── Development: Create Fake Users ───
@app.post("/api/dev/create-fake-users")
@limiter.limit("2/minute")
def create_fake_users(request: Request, db: Session = Depends(get_db)):
    """Create 10 fake users for testing (dev only)"""
    if os.getenv("ENV", "development") == "production":
        raise HTTPException(status_code=403, detail="This endpoint is disabled in production")

    fake_users_data = [
        {
            "name": "Emma Johnson",
            "email": "emma.johnson@mail.mcgill.ca",
            "university": "mcgill",
            "program": "Engineering",
            "bio": "Third-year engineering student who loves hiking and cooking. Looking for a clean, quiet roommate.",
            "responses": {"hasApartment": 1, "livingLocation": 1, "gender": 1, "genderPreference": 2, "age": 1, "program": 2, "budget": 1, "location": 0, "religion": 5, "sleepSchedule": 2, "cleanliness": 1, "noise": 0, "guests": 1, "study": 2, "dietary": 0, "workFromHome": 1, "pets": 2, "language": 0, "moveIn": 0}
        },
        {
            "name": "Liam Chen",
            "email": "liam.chen@concordia.ca",
            "university": "concordia",
            "program": "Commerce/Management",
            "bio": "Business student and gym enthusiast. Social but respectful of personal space.",
            "responses": {"hasApartment": 1, "livingLocation": 1, "gender": 0, "genderPreference": 2, "age": 0, "program": 3, "budget": 2, "location": 2, "religion": 0, "sleepSchedule": 1, "cleanliness": 1, "noise": 2, "guests": 2, "study": 1, "dietary": 0, "workFromHome": 0, "pets": 0, "language": 0, "moveIn": 0}
        },
        {
            "name": "Sophia Patel",
            "email": "sophia.patel@mcgill.ca",
            "university": "mcgill",
            "program": "Science",
            "bio": "Pre-med student who studies a lot. Looking for someone serious about academics.",
            "responses": {"hasApartment": 1, "livingLocation": 0, "mcgillResidence": 1, "gender": 1, "genderPreference": 1, "age": 1, "program": 1, "budget": 0, "location": 0, "religion": 4, "sleepSchedule": 0, "cleanliness": 0, "noise": 0, "guests": 0, "study": 0, "dietary": 1, "workFromHome": 0, "pets": 3, "language": 2, "moveIn": 0}
        },
        {
            "name": "Noah Tremblay",
            "email": "noah.tremblay@live.concordia.ca",
            "university": "concordia",
            "program": "Arts",
            "bio": "Art history major and part-time barista. Love music, museums, and good conversations.",
            "responses": {"hasApartment": 1, "livingLocation": 1, "gender": 0, "genderPreference": 2, "age": 1, "program": 0, "budget": 1, "location": 1, "religion": 0, "sleepSchedule": 2, "cleanliness": 2, "noise": 1, "guests": 2, "study": 1, "dietary": 2, "workFromHome": 2, "pets": 2, "language": 2, "moveIn": 1}
        },
        {
            "name": "Olivia Martinez",
            "email": "olivia.martinez@mail.mcgill.ca",
            "university": "mcgill",
            "program": "Law",
            "bio": "Law student looking for a quiet study environment. I'm organized and respectful.",
            "responses": {"hasApartment": 1, "livingLocation": 0, "mcgillResidence": 1, "gender": 1, "genderPreference": 1, "age": 2, "program": 5, "budget": 2, "location": 0, "religion": 1, "sleepSchedule": 0, "cleanliness": 0, "noise": 0, "guests": 0, "study": 0, "dietary": 0, "workFromHome": 1, "pets": 0, "language": 0, "moveIn": 0}
        },
        {
            "name": "Ethan Kim",
            "email": "ethan.kim@concordia.ca",
            "university": "concordia",
            "program": "Engineering",
            "bio": "Computer engineering student and gamer. Night owl who's chill and easy-going.",
            "responses": {"hasApartment": 1, "livingLocation": 1, "gender": 0, "genderPreference": 2, "age": 0, "program": 2, "budget": 1, "location": 4, "religion": 0, "sleepSchedule": 1, "cleanliness": 2, "noise": 1, "guests": 1, "study": 2, "dietary": 0, "workFromHome": 3, "pets": 2, "language": 0, "moveIn": 0}
        },
        {
            "name": "Ava Leblanc",
            "email": "ava.leblanc@mcgill.ca",
            "university": "mcgill",
            "program": "Music",
            "bio": "Music performance student. I practice piano daily but use headphones! Love cats.",
            "responses": {"hasApartment": 1, "livingLocation": 0, "mcgillResidence": 0, "gender": 1, "genderPreference": 2, "age": 0, "program": 6, "budget": 0, "location": 1, "religion": 0, "sleepSchedule": 2, "cleanliness": 1, "noise": 1, "guests": 1, "study": 2, "dietary": 2, "workFromHome": 1, "pets": 1, "language": 2, "moveIn": 0}
        },
        {
            "name": "Mason Williams",
            "email": "mason.williams@live.concordia.ca",
            "university": "concordia",
            "program": "Science",
            "bio": "Biology major and fitness enthusiast. Early riser who keeps things clean and organized.",
            "responses": {"hasApartment": 1, "livingLocation": 1, "gender": 0, "genderPreference": 2, "age": 1, "program": 1, "budget": 1, "location": 3, "religion": 1, "sleepSchedule": 0, "cleanliness": 0, "noise": 1, "guests": 1, "study": 1, "dietary": 3, "workFromHome": 0, "pets": 2, "language": 0, "moveIn": 0}
        },
        {
            "name": "Isabella Nguyen",
            "email": "isabella.nguyen@mail.mcgill.ca",
            "university": "mcgill",
            "program": "Commerce/Management",
            "bio": "Marketing major and social butterfly. Love hosting small gatherings and trying new recipes.",
            "responses": {"hasApartment": 1, "livingLocation": 1, "gender": 1, "genderPreference": 2, "age": 1, "program": 3, "budget": 2, "location": 2, "religion": 2, "sleepSchedule": 2, "cleanliness": 1, "noise": 2, "guests": 3, "study": 1, "dietary": 0, "workFromHome": 2, "pets": 2, "language": 0, "moveIn": 1}
        },
        {
            "name": "James Anderson",
            "email": "james.anderson@concordia.ca",
            "university": "concordia",
            "program": "Education",
            "bio": "Education student and aspiring teacher. Friendly, responsible, and drama-free.",
            "responses": {"hasApartment": 1, "livingLocation": 1, "gender": 0, "genderPreference": 2, "age": 2, "program": 7, "budget": 1, "location": 0, "religion": 1, "sleepSchedule": 0, "cleanliness": 1, "noise": 1, "guests": 2, "study": 2, "dietary": 0, "workFromHome": 1, "pets": 2, "language": 0, "moveIn": 0}
        }
    ]

    password = "password123"
    hashed_password = pwd_context.hash(password)
    created_users = []

    for fake_data in fake_users_data:
        existing = db.query(User).filter(User.email == fake_data["email"]).first()
        if existing:
            continue

        user = User(
            name=fake_data["name"],
            email=fake_data["email"],
            password_hash=hashed_password,
            university=fake_data["university"],
            program=fake_data["program"],
            bio=fake_data["bio"],
            email_verified=True,
            questionnaire_completed=True
        )
        db.add(user)
        db.flush()

        questionnaire = QuestionnaireResponse(
            user_id=user.id,
            responses=fake_data["responses"]
        )
        db.add(questionnaire)

        created_users.append({"name": fake_data["name"], "email": fake_data["email"], "user_id": user.id})

    db.commit()

    return {
        "message": f"Created {len(created_users)} fake users",
        "users": created_users
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Agent 2 — New Route Handlers
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Password Reset ───

@app.post("/api/auth/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Request a password reset link. Always returns 200 to prevent account enumeration.
    If the email exists, a reset link is sent via email.
    """
    ANTI_ENUM_MSG = "If that email is registered, you'll receive a reset link"

    email = data.email.lower()
    user = db.query(User).filter(User.email == email).first()

    if user:
        # Delete all existing tokens for this user (used or unused)
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
        db.commit()

        # Generate a new token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at,
            used=False
        )
        db.add(reset_token)
        db.commit()

        # Send reset email in background thread
        reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
        parts = user.name.split() if user.name else []
        first_name = parts[0] if parts else "there"
        html_content = f"""
        <h2>Password Reset Request</h2>
        <p>Hi {first_name},</p>
        <p>We received a request to reset your MatchMyRoom password.</p>
        <p><a href="{reset_link}" style="background-color:#c8102e;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">Reset My Password</a></p>
        <p>Or copy this link: {reset_link}</p>
        <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        """
        threading.Thread(
            target=lambda: send_email(email, "Reset your MatchMyRoom password", html_content),
            daemon=True
        ).start()

    return {"message": ANTI_ENUM_MSG}


@app.post("/api/auth/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset user password using a valid reset token.
    Returns 400 if the token is invalid, expired, or already used.
    """
    # Look up token
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == data.token
    ).first()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if reset_token.used:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Check expiry (stored as naive UTC datetime)
    if reset_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Hash new password and update user
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.password_hash = pwd_context.hash(data.new_password)

    # Mark token as used
    reset_token.used = True

    # Cleanup: delete all expired tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.expires_at < datetime.utcnow(),
    ).delete()

    db.commit()

    return {"message": "Password reset successfully"}


# ─── Account Deletion ───

@app.delete("/api/users/{user_id}")
def delete_account(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a user account and all associated data.
    JWT must belong to the user being deleted.
    """
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot delete another user's account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Cascade delete in the correct order to avoid FK constraint violations

    # 1. Reports
    db.query(Report).filter(
        (Report.reporter_id == user_id) | (Report.reported_id == user_id)
    ).delete(synchronize_session=False)

    # 2. Blocks
    db.query(Block).filter(
        (Block.blocker_id == user_id) | (Block.blocked_id == user_id)
    ).delete(synchronize_session=False)

    # 3. Messages
    db.query(Message).filter(
        (Message.sender_id == user_id) | (Message.recipient_id == user_id)
    ).delete(synchronize_session=False)

    # 4. Likes
    db.query(Like).filter(
        (Like.user_id == user_id) | (Like.liked_user_id == user_id)
    ).delete(synchronize_session=False)

    # 5. Matches
    db.query(Match).filter(
        (Match.user1_id == user_id) | (Match.user2_id == user_id)
    ).delete(synchronize_session=False)

    # 6. Password reset tokens
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete()

    # 7. Email verifications (QuestionnaireResponse handled by ondelete=CASCADE on user FK)
    db.query(QuestionnaireResponse).filter(QuestionnaireResponse.user_id == user_id).delete()

    # 8. Delete Cloudinary profile photo (best effort — do not raise if not found)
    if user.profile_pic_url:
        try:
            delete_profile_picture(user.id)
        except Exception as e:
            print(f"Warning: Could not delete Cloudinary photo for user {user_id}: {e}")

    # 9. Delete the user row
    db.delete(user)
    db.commit()

    return {"message": "Account deleted"}


# ─── Block / Unblock / Report ───

@app.post("/api/users/{user_id}/block")
def block_user(
    user_id: int,
    data: BlockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Block another user. Bidirectional block filtering applies to matches, threads, and messaging.
    Note: existing match rows and message threads are NOT deleted — they are hidden at the API layer.
    If the block is later removed, they will reappear.
    """
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot block as another user")

    if data.blocked_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    # Check if target user exists
    target = db.query(User).filter(User.id == data.blocked_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already blocked
    existing = db.query(Block).filter(
        Block.blocker_id == user_id,
        Block.blocked_id == data.blocked_user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already blocked")

    block = Block(blocker_id=user_id, blocked_id=data.blocked_user_id)
    db.add(block)
    db.commit()

    return {"message": "User blocked"}


@app.delete("/api/users/{user_id}/block/{blocked_user_id}")
def unblock_user(
    user_id: int,
    blocked_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a block. Once removed, matches and threads between the users reappear."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot unblock as another user")

    block = db.query(Block).filter(
        Block.blocker_id == user_id,
        Block.blocked_id == blocked_user_id
    ).first()

    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    db.delete(block)
    db.commit()

    return {"message": "User unblocked"}


@app.post("/api/users/{user_id}/report")
def report_user(
    user_id: int,
    data: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Report another user. Duplicate reports are allowed (append-only for moderation review).
    """
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot report as another user")

    if data.reported_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot report yourself")

    # Check if target user exists
    target = db.query(User).filter(User.id == data.reported_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    report = Report(
        reporter_id=user_id,
        reported_id=data.reported_user_id,
        reason=data.reason
    )
    db.add(report)
    db.commit()

    return {"message": "Report submitted"}