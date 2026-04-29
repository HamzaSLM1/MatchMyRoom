from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Float, ForeignKey, Index, PrimaryKeyConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid


Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    university = Column(String, nullable=True)  # "mcgill" or "concordia"
    program = Column(String(100), nullable=True)  # User's program/faculty of study
    bio = Column(String(500), nullable=True)  # User bio/description
    profile_pic_url = Column(String, nullable=True)  # Cloudinary URL
    social_links = Column(JSON, nullable=True)  # { instagram, linkedin, twitter }
    questionnaire_completed = Column(Boolean, default=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Share token for public profile links (Feature 12)
    share_token = Column(String, unique=True, nullable=True, index=True)

    # Last seen timestamp for online presence tracking (Feature 3)
    # None means the user is currently online; a datetime means they were last seen at that time
    last_seen = Column(DateTime, nullable=True)

    # Relationships
    questionnaire = relationship("QuestionnaireResponse", back_populates="user", uselist=False)
    matches_as_user1 = relationship("Match", foreign_keys="Match.user1_id", back_populates="user1")
    matches_as_user2 = relationship("Match", foreign_keys="Match.user2_id", back_populates="user2")
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.recipient_id", back_populates="recipient")


class QuestionnaireResponse(Base):
    __tablename__ = "questionnaire_responses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    responses = Column(JSON, nullable=False)  # Store as JSON object
    completed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="questionnaire")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user2_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    compatibility_score = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Composite index for efficient match lookups
    __table_args__ = (
        Index("ix_match_users", "user1_id", "user2_id"),
    )

    # Relationships
    user1 = relationship("User", foreign_keys=[user1_id], back_populates="matches_as_user1")
    user2 = relationship("User", foreign_keys=[user2_id], back_populates="matches_as_user2")


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    liked_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    is_like = Column(Boolean, nullable=False)  # True for right swipe (like), False for left swipe (pass)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Composite index for efficient like lookups and mutual-like reverse lookups
    __table_args__ = (
        Index("ix_like_users", "user_id", "liked_user_id"),
        Index("ix_like_reverse", "liked_user_id", "user_id"),
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    liked_user = relationship("User", foreign_keys=[liked_user_id])


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(String(10000), nullable=False)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    read = Column(Boolean, default=False)

    # Two directional indexes to support OR-based thread queries efficiently
    __table_args__ = (
        Index("ix_message_sender", "sender_id", "sent_at"),
        Index("ix_message_recipient", "recipient_id", "sent_at"),
    )

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")


# ─── Agent 2 Models ───

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)

    # Relationship
    user = relationship("User", foreign_keys=[user_id])


class Block(Base):
    __tablename__ = "blocks"

    blocker_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    blocked_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        PrimaryKeyConstraint("blocker_id", "blocked_id"),
        Index("ix_block_blocked_id", "blocked_id"),
    )

    # Relationships
    blocker = relationship("User", foreign_keys=[blocker_id])
    blocked = relationship("User", foreign_keys=[blocked_id])


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reported_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_id])
    reported = relationship("User", foreign_keys=[reported_id])
