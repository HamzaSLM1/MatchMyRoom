from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional, Dict, Any, List, Union
from datetime import datetime


# ─── Auth Schemas ───
class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    message: str
    user_id: int
    email: str
    name: str
    university: str
    questionnaire_completed: bool = False
    token: str = ""
    dev_code: Optional[str] = None  # Verification code shown in dev mode


# ─── Profile Schemas ───
class ProfileUpdateRequest(BaseModel):
    bio: Optional[str] = Field(None, max_length=500)
    social_links: Optional[Dict[str, str]] = None


class UserProfile(BaseModel):
    id: int
    name: str
    email: str
    university: str
    program: Optional[str] = None
    bio: Optional[str] = None
    profile_pic_url: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    questionnaire_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Questionnaire Schemas ───
class QuestionnaireSubmit(BaseModel):
    responses: Dict[str, Union[int, str]]  # question_id -> option_index or custom string


class QuestionnaireResponse(BaseModel):
    id: int
    user_id: int
    responses: Dict[str, Any]
    completed_at: datetime

    class Config:
        from_attributes = True


# ─── Match Schemas ───
class MatchResponse(BaseModel):
    id: int
    user_id: int
    name: str
    program: Optional[str] = None
    university: str
    compatibility_score: float
    profile_pic_url: Optional[str] = None
    bio: Optional[str] = None
    # Questionnaire highlights
    gender: Optional[str] = None
    area: Optional[str] = None
    budget: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    # Apartment fields
    has_apartment: Optional[bool] = None
    spots_available: Optional[str] = None
    apartment_available: Optional[str] = None
    apartment_rooms: Optional[str] = None


# ─── Message Schemas ───
class MessageSendRequest(BaseModel):
    recipient_id: int
    content: str = Field(..., min_length=1, max_length=10000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    content: str
    sent_at: datetime
    read: bool

    class Config:
        from_attributes = True


class ConversationPreview(BaseModel):
    user_id: int
    name: str
    profile_pic_url: Optional[str] = None
    last_message: str
    last_message_time: datetime
    unread_count: int


# ─── Email Verification Schemas ───
class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


class VerifyEmailResponse(BaseModel):
    message: str
    email_verified: bool


class ResendCodeRequest(BaseModel):
    email: EmailStr


# ─── Swipe/Like Schemas ───
class SwipeRequest(BaseModel):
    liked_user_id: int
    is_like: bool  # True for right swipe (like), False for left swipe (pass)


class SwipeResponse(BaseModel):
    message: str
    is_mutual_match: bool = False  # True if both users have liked each other
    match_name: Optional[str] = None  # Name of the person who previously liked this user


class SendInitialMessageRequest(BaseModel):
    recipient_id: int
    content: str = Field(..., min_length=1, max_length=10000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()


# ─── Agent 2 Schemas ───

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class BlockRequest(BaseModel):
    blocked_user_id: int


class ReportRequest(BaseModel):
    reported_user_id: int
    reason: str = Field(..., min_length=1, max_length=500)
