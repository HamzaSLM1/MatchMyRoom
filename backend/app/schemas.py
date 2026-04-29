from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional, Dict, Any, List, Union
from datetime import datetime


# ─── Profile Schemas ───
class ProfileUpdateRequest(BaseModel):
    bio: Optional[str] = Field(None, max_length=500)
    social_links: Optional[Dict[str, str]] = None


class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    university: Optional[str] = None
    program: Optional[str] = None
    bio: Optional[str] = None
    profile_pic_url: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    questionnaire_completed: bool
    created_at: datetime
    last_seen: Optional[datetime] = None  # Feature 3: last seen tracking
    is_online: Optional[bool] = False     # Feature 3: True when last_seen is None and WS connected

    class Config:
        from_attributes = True


# ─── Questionnaire Schemas ───
class QuestionnaireSubmit(BaseModel):
    responses: Dict[str, Union[int, str]]  # question_id -> option_index or custom string


class QuestionnaireResponse(BaseModel):
    id: str
    user_id: str
    responses: Dict[str, Any]
    completed_at: datetime

    class Config:
        from_attributes = True


# ─── Match Schemas ───
class MatchResponse(BaseModel):
    id: str
    user_id: str
    name: str
    program: Optional[str] = None
    university: Optional[str] = None
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
    recipient_id: str
    content: str = Field(..., min_length=1, max_length=10000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()


class MessageResponse(BaseModel):
    id: str
    sender_id: str
    recipient_id: str
    content: str
    sent_at: datetime
    read: bool

    class Config:
        from_attributes = True


class ConversationPreview(BaseModel):
    user_id: str
    name: str
    profile_pic_url: Optional[str] = None
    last_message: str
    last_message_time: datetime
    unread_count: int


# ─── Swipe/Like Schemas ───
class SwipeRequest(BaseModel):
    liked_user_id: str
    is_like: bool  # True for right swipe (like), False for left swipe (pass)


class SwipeResponse(BaseModel):
    message: str
    is_mutual_match: bool = False  # True if both users have liked each other
    match_name: Optional[str] = None  # Name of the person who previously liked this user


class SwipeHistoryItem(BaseModel):
    user_id: str
    name: Optional[str] = None
    university: Optional[str] = None
    profile_pic_url: Optional[str] = None
    program: Optional[str] = None
    is_mutual: bool
    swiped_at: Optional[str] = None

    class Config:
        from_attributes = True


class SendInitialMessageRequest(BaseModel):
    recipient_id: str
    content: str = Field(..., min_length=1, max_length=10000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()


# ─── Agent 2 Schemas ───
class BlockRequest(BaseModel):
    blocked_user_id: str


class ReportRequest(BaseModel):
    reported_user_id: str
    reason: str = Field(..., min_length=1, max_length=500)
