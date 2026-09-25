import os
import sys
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import sqlalchemy.sql.sqltypes as sa_sqltypes
from fastapi.testclient import TestClient
from unittest.mock import patch

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Set required env vars before importing backend modules
# These must be set before any backend imports since database.py validates
# DATABASE_URL, and main.py validates SUPABASE_URL, at module level.
#
# DATABASE_URL is force-overridden (not setdefault) on purpose: the `client`
# fixture below runs FastAPI's startup event via TestClient, which calls
# database.py's init_db() — and for any postgresql:// URL, that runs
# `alembic upgrade head`. If a developer's shell already has a real
# staging/production DATABASE_URL exported (e.g. from `railway run`), a plain
# setdefault would let it leak in here and the test suite would silently
# migrate a real database. Always force sqlite for the suite; a real Postgres
# is only ever touched by tests/test_migrations.py, and only via the
# separate, explicitly opt-in TEST_POSTGRES_URL.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")

from backend.app.models import Base
from backend.app.database import get_db
from backend.app.main import app, limiter


# models.py uses sqlalchemy.dialects.postgresql.UUID, which SQLite's DDL compiler
# cannot render on its own. Teach it to emit CHAR(36) for the test SQLite engine only
# — this is a test-only compiler hook, it does not touch any application file, and
# SQLAlchemy's UUID type already round-trips through str/uuid.UUID transparently on
# non-native-UUID backends once the column can be created.
@compiles(PG_UUID, "sqlite")
def _compile_pg_uuid_for_sqlite(element, compiler, **kw):
    return "CHAR(36)"


# On real Postgres, comparing a UUID column to a plain string (e.g. `User.id == user_id`
# where `user_id: str` comes from a path param) works because the native driver casts
# the string at the DB layer. SQLite has no native UUID type, so SQLAlchemy's
# character-based UUID bind processor requires an actual `uuid.UUID` (it calls
# `.hex` on the bound value) and raises AttributeError on a plain string. This patches
# SQLAlchemy's own Uuid.bind_processor, for this test process only, to coerce strings
# to uuid.UUID first — it does not touch any application file.
_orig_uuid_bind_processor = sa_sqltypes.Uuid.bind_processor


def _coercing_uuid_bind_processor(self, dialect):
    orig = _orig_uuid_bind_processor(self, dialect)
    if orig is None:
        return None

    def process(value):
        if isinstance(value, str):
            value = uuid.UUID(value)
        return orig(value)

    return process


sa_sqltypes.Uuid.bind_processor = _coercing_uuid_bind_processor

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


# ── Fake Supabase auth ──
# main.py verifies bearer tokens by calling the module-level `_decode_supabase_token`,
# which normally hits Supabase's JWKS endpoint over the network. For tests we patch
# that function to decode a fake token format instead, so tests never touch the network.
FAKE_TOKEN_PREFIX = "faketoken"


def _fake_decode_supabase_token(token: str) -> dict:
    parts = token.split(":", 2)
    if len(parts) != 3 or parts[0] != FAKE_TOKEN_PREFIX:
        raise ValueError("Invalid token")
    _, user_id_str, email = parts
    return {"sub": user_id_str, "email": email}


def auth_header(user_id, email: str) -> dict:
    """Return an Authorization header dict with a fake bearer token for the given user.

    Decoded by the patched `_decode_supabase_token` (see the `client` fixture),
    never by real JWT/JWKS verification.
    """
    token = f"{FAKE_TOKEN_PREFIX}:{user_id}:{email}"
    return {"Authorization": f"Bearer {token}"}


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
    """FastAPI TestClient with the DB dependency overridden and Supabase token
    verification mocked out (see `_fake_decode_supabase_token`)."""

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with patch("backend.app.main._decode_supabase_token", side_effect=_fake_decode_supabase_token):
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c
    app.dependency_overrides.clear()


# ── Helper factories ──

@pytest.fixture()
def create_verified_user(db_session):
    """Factory fixture: creates a user and returns the ORM object."""
    from backend.app.models import User

    def _create(name="Test User", email="test@mcgill.ca"):
        user = User(
            id=uuid.uuid4(),
            name=name,
            email=email,
            university="mcgill" if "mcgill" in email else "concordia",
            questionnaire_completed=False,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _create


@pytest.fixture()
def create_user_with_questionnaire(db_session, create_verified_user):
    """Factory fixture: creates a user with a completed questionnaire."""
    from backend.app.models import QuestionnaireResponse

    def _create(name="Test User", email="test@mcgill.ca", responses=None):
        if responses is None:
            responses = sample_questionnaire_responses()
        user = create_verified_user(name=name, email=email)
        user.questionnaire_completed = True
        q = QuestionnaireResponse(user_id=user.id, responses=responses)
        db_session.add(q)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _create


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
