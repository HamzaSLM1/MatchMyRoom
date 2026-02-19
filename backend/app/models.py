from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Float, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone


Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    university = Column(String, nullable=False)  # "mcgill" or "concordia"
    program = Column(String(100), nullable=True)  # User's program/faculty of study
    bio = Column(String(500), nullable=True)  # User bio/description
    profile_pic_url = Column(String, nullable=True)  # Cloudinary URL
    questionnaire_completed = Column(Boolean, default=False)

    # Email verification
    email_verified = Column(Boolean, default=False)
    verification_code = Column(String, nullable=True)
    verification_code_expires = Column(DateTime, nullable=True)
    verification_attempts = Column(Integer, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    questionnaire = relationship("QuestionnaireResponse", back_populates="user", uselist=False)
    matches_as_user1 = relationship("Match", foreign_keys="Match.user1_id", back_populates="user1")
    matches_as_user2 = relationship("Match", foreign_keys="Match.user2_id", back_populates="user2")
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.recipient_id", back_populates="recipient")


class QuestionnaireResponse(Base):
    __tablename__ = "questionnaire_responses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    responses = Column(JSON, nullable=False)  # Store as JSON object
    completed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="questionnaire")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user2_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    liked_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    is_like = Column(Boolean, nullable=False)  # True for right swipe (like), False for left swipe (pass)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Composite index for efficient like lookups
    __table_args__ = (
        Index("ix_like_users", "user_id", "liked_user_id"),
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    liked_user = relationship("User", foreign_keys=[liked_user_id])


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(String(10000), nullable=False)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    read = Column(Boolean, default=False)

    # Composite index for efficient thread lookups
    __table_args__ = (
        Index("ix_message_thread", "sender_id", "recipient_id", "sent_at"),
    )

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")
