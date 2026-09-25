import pytest
import sys
import importlib
from unittest.mock import patch


def test_database_url_required_when_not_set(monkeypatch):
    """Importing database.py without DATABASE_URL set must raise RuntimeError."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    # Remove cached module so re-import triggers module-level check
    for key in list(sys.modules.keys()):
        if "backend.app.database" in key or "app.database" in key:
            del sys.modules[key]
    # Patch load_dotenv so it doesn't re-populate DATABASE_URL from backend/.env
    # (database.py calls load_dotenv() unconditionally at import time).
    with patch("dotenv.load_dotenv", return_value=None):
        with pytest.raises(RuntimeError, match="DATABASE_URL"):
            import backend.app.database  # noqa: F401


def test_database_url_accepted_when_set(monkeypatch):
    """Importing database.py with DATABASE_URL set must not raise."""
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./test_config.db")
    for key in list(sys.modules.keys()):
        if "backend.app.database" in key or "app.database" in key:
            del sys.modules[key]
    # Should not raise
    import backend.app.database  # noqa: F401
    import os, pathlib
    pathlib.Path("test_config.db").unlink(missing_ok=True)
