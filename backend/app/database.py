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
    """Build the schema on startup: Alembic for postgres, create_all otherwise."""
    # The migration chain is postgres-only (it uses TRUNCATE ... CASCADE), so for
    # SQLite - local dev and the test suite - build straight from the models.
    if not DATABASE_URL.startswith("postgresql"):
        Base.metadata.create_all(bind=engine)
        print("✅ Non-postgres database: tables created via create_all")
        return

    from alembic.config import Config
    from alembic import command

    # Resolve alembic.ini path relative to this file's package root
    alembic_cfg_path = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
    alembic_cfg = Config(os.path.abspath(alembic_cfg_path))
    # Let a migration failure propagate: falling back to create_all would
    # leave the database on a schema Alembic doesn't know about.
    command.upgrade(alembic_cfg, "head")


def get_db():
    """Dependency for FastAPI endpoints to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
