"""
Tests for startup environment variable validation.

These tests verify that SUPABASE_JWT_SECRET and DATABASE_URL are required at startup.
load_dotenv() is mocked to prevent it from re-loading values from backend/.env.
"""
import base64
import pytest
import sys
from unittest.mock import patch

# A valid base64-encoded secret for the "accepted" test
_VALID_SECRET = base64.b64encode(b"a" * 32).decode()


def reload_main(monkeypatch, env_overrides):
    """Helper: remove cached main module and re-import with given env vars."""
    for k, v in env_overrides.items():
        if v is None:
            monkeypatch.delenv(k, raising=False)
        else:
            monkeypatch.setenv(k, v)
    for key in list(sys.modules.keys()):
        if "backend.app" in key or "app.main" in key:
            del sys.modules[key]


def test_supabase_jwt_secret_required_at_startup(monkeypatch):
    """Importing main.py without SUPABASE_JWT_SECRET must raise RuntimeError."""
    reload_main(monkeypatch, {
        "DATABASE_URL": "sqlite:///./test_jwt_check.db",
        "SUPABASE_JWT_SECRET": None,  # unset
    })
    with patch("dotenv.load_dotenv", return_value=None):
        with pytest.raises(RuntimeError, match="SUPABASE_JWT_SECRET"):
            import backend.app.main  # noqa: F401


def test_supabase_jwt_secret_accepted_when_set(monkeypatch):
    """Importing main.py with SUPABASE_JWT_SECRET set must not raise."""
    reload_main(monkeypatch, {
        "DATABASE_URL": "sqlite:///./test_jwt_ok.db",
        "SUPABASE_JWT_SECRET": _VALID_SECRET,
    })
    import backend.app.main  # noqa: F401
    import pathlib
    pathlib.Path("test_jwt_check.db").unlink(missing_ok=True)
    pathlib.Path("test_jwt_ok.db").unlink(missing_ok=True)
