import os
import sys
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from unittest.mock import patch

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Set required env vars before importing backend modules
# These must be set before any backend imports since database.py and main.py
# validate them at module level.
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-key-that-is-32-chars-long!!")

from backend.app.models import Base
from backend.app.database import get_db
from backend.app.main import app, create_token, pwd_context, limiter

# ── In-memory SQLite for tests ──
# StaticPool ensures all sessions share the same connection, which is required
# for SQLite in-memory databases (each connection gets its own database otherwise).
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Disable rate limiting for all tests
limiter.enabled = False


# ── Fixtures ──

@pytest.fixture(autouse=True)
def setup_database():
    """Create all tables before each test and drop them after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    """Provide a transactional database session for a test."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session):
    """FastAPI TestClient with the DB dependency overridden."""

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ── Helper factories ──

@pytest.fixture()
def create_verified_user(db_session):
    """Factory fixture: creates a verified user and returns the ORM object."""
    from backend.app.models import User

    def _create(name="Test User", email="test@mcgill.ca", password="password123"):
        user = User(
            name=name,
            email=email,
            password_hash=pwd_context.hash(password),
            university="mcgill" if "mcgill" in email else "concordia",
            email_verified=True,
            questionnaire_completed=False,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _create


@pytest.fixture()
def create_user_with_questionnaire(db_session, create_verified_user):
    """Factory fixture: creates a verified user with a completed questionnaire."""
    from backend.app.models import QuestionnaireResponse

    def _create(name="Test User", email="test@mcgill.ca", password="password123", responses=None):
        if responses is None:
            responses = sample_questionnaire_responses()
        user = create_verified_user(name=name, email=email, password=password)
        user.questionnaire_completed = True
        q = QuestionnaireResponse(user_id=user.id, responses=responses)
        db_session.add(q)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _create


def auth_header(user_id: int, email: str) -> dict:
    """Return an Authorization header dict with a valid JWT for the given user."""
    token = create_token(user_id, email)
    return {"Authorization": f"Bearer {token}"}


def sample_questionnaire_responses() -> dict:
    """Standard questionnaire responses for testing."""
    return {
        "hasApartment": 1,
        "housingType": 1,
        "gender": 0,
        "genderPreference": 3,
        "age": 1,
        "program": 2,
        "budget": 1,
        "location": 2,
        "religion": 0,
        "sleepSchedule": 1,
        "cleanliness": 1,
        "noise": 1,
        "guests": 1,
        "study": 2,
        "dietary": 0,
        "workFromHome": 1,
        "pets": 2,
        "language": 0,
        "moveIn": 0,
    }
