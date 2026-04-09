from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from .models import Base

# Load .env early so DATABASE_URL is available at import time
load_dotenv()

# ─── Startup Validation ───
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is required. "
        "Set it in your .env file. Example: "
        "postgresql://user:password@localhost:5432/matchmyroom"
    )

# Preserve SQLite thread safety for test suite (tests use sqlite:// URLs)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=3600,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Run Alembic migrations to head on startup, with fallback to create_all."""
    try:
        from alembic.config import Config
        from alembic import command
        import os

        # Resolve alembic.ini path relative to this file's package root
        alembic_cfg_path = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
        alembic_cfg = Config(os.path.abspath(alembic_cfg_path))
        command.upgrade(alembic_cfg, "head")
    except Exception as e:
        print(f"⚠️  Alembic migration failed ({e}), falling back to create_all...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created via create_all fallback")

    # Force clear all users
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("TRUNCATE users CASCADE;"))
            conn.commit()
        print("✅ Users table truncated")
    except Exception as e:
        print(f"⚠️  Failed to truncate users: {e}")


def get_db():
    """Dependency for FastAPI endpoints to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
