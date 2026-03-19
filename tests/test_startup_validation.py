import pytest
import sys


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


def test_jwt_secret_required_at_startup(monkeypatch):
    """Importing main.py without JWT_SECRET must raise RuntimeError."""
    reload_main(monkeypatch, {
        "DATABASE_URL": "sqlite:///./test_jwt_check.db",
        "JWT_SECRET": None,  # unset
    })
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        import backend.app.main  # noqa: F401


def test_jwt_secret_accepted_when_set(monkeypatch):
    """Importing main.py with JWT_SECRET set must not raise."""
    reload_main(monkeypatch, {
        "DATABASE_URL": "sqlite:///./test_jwt_ok.db",
        "JWT_SECRET": "a" * 32,
    })
    import backend.app.main  # noqa: F401
    import pathlib
    pathlib.Path("test_jwt_check.db").unlink(missing_ok=True)
    pathlib.Path("test_jwt_ok.db").unlink(missing_ok=True)
