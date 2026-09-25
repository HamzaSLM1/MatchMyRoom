"""Regression tests for the Alembic migration chain.

Context: backend/alembic/versions/c3d4e5f6a7b8_truncate_users_cascade.py used
to run `TRUNCATE users CASCADE` in its upgrade(), which — combined with
database.py's init_db() running `alembic upgrade head` automatically on
startup for any postgresql:// DATABASE_URL — meant a routine deploy could
silently wipe every user and all dependent data. It has been neutralized to
a no-op. The baseline migration (a1b2c3d4e5f6) also used to hand-write an
old, pre-Supabase schema (integer `users.id`, password columns) that no
longer matches backend/app/models.py; it now builds the schema from
Base.metadata directly, idempotently.

TestStaticMigrationSafety needs no database and always runs. TestPostgresMigration
exercises the real chain against a disposable Postgres and is skipped unless
TEST_POSTGRES_URL is set — it never touches DATABASE_URL, so it can't
accidentally run against whatever database a developer's shell happens to
have configured.
"""
import ast
import glob
import os
import re
import uuid

import pytest

ALEMBIC_VERSIONS_DIR = os.path.join(
    os.path.dirname(__file__), "..", "backend", "alembic", "versions"
)

# Statements that must never appear in a migration's upgrade() — each one
# can silently destroy data for every existing deployment that reaches it.
DANGEROUS_PATTERNS = [
    re.compile(r"\bTRUNCATE\b", re.IGNORECASE),
    re.compile(r"\bDROP\s+DATABASE\b", re.IGNORECASE),
    re.compile(r"\bDELETE\s+FROM\s+\w+\s*;", re.IGNORECASE),  # unconditional DELETE
]


def _migration_files():
    return sorted(glob.glob(os.path.join(ALEMBIC_VERSIONS_DIR, "*.py")))


def _upgrade_body_source(path):
    """Return the source of a migration's upgrade() function, docstring excluded.

    Scanning the whole file would flag legitimate prose (this file's own
    docstrings, revision comments explaining a past bug) as "dangerous SQL".
    Only the actual executable body of upgrade() can run destructive
    statements, so that's the only thing worth scanning.
    """
    with open(path) as f:
        source = f.read()
    tree = ast.parse(source, filename=path)
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == "upgrade":
            body = node.body
            # Skip a leading docstring statement, if present.
            if (
                body
                and isinstance(body[0], ast.Expr)
                and isinstance(getattr(body[0], "value", None), ast.Constant)
                and isinstance(body[0].value.value, str)
            ):
                body = body[1:]
            segments = [ast.get_source_segment(source, stmt) or "" for stmt in body]
            return "\n".join(segments)
    return ""


class TestStaticMigrationSafety:
    def test_at_least_one_migration_exists(self):
        assert _migration_files(), "expected alembic/versions to contain migration files"

    def test_no_migration_contains_dangerous_sql(self):
        offenders = []
        for path in _migration_files():
            upgrade_source = _upgrade_body_source(path)
            for pattern in DANGEROUS_PATTERNS:
                if pattern.search(upgrade_source):
                    offenders.append((os.path.basename(path), pattern.pattern))
        assert offenders == [], (
            f"migration(s) contain dangerous SQL in upgrade() that could destroy "
            f"data on deploy: {offenders}"
        )

    def test_truncate_migration_is_neutralized(self):
        """Guards specifically against re-introducing the exact bug this suite exists for."""
        matches = glob.glob(os.path.join(ALEMBIC_VERSIONS_DIR, "*truncate*"))
        assert matches, "expected the truncate_users_cascade revision file to still exist"
        assert "TRUNCATE" not in _upgrade_body_source(matches[0]).upper()


def _postgres_available():
    return bool(os.environ.get("TEST_POSTGRES_URL"))


@pytest.mark.skipif(
    not _postgres_available(),
    reason=(
        "TEST_POSTGRES_URL not set — skipping real-Postgres migration rehearsal. "
        "Point it at a disposable Postgres reachable over TCP (e.g. a local "
        "`initdb`'d cluster or throwaway container) to exercise this, e.g.: "
        "TEST_POSTGRES_URL=postgresql://postgres@127.0.0.1:5432/postgres "
        "(a unix-socket URL also works, but its percent-encoded host= query "
        "param needs care around alembic's ConfigParser-based Config object)"
    ),
)
class TestPostgresMigration:
    """Exercises the real alembic chain against disposable Postgres.

    Never touches DATABASE_URL or backend.app.database — deliberately uses its
    own bare engine + `alembic.command`, so it cannot interact with anything
    the rest of the suite (or an ambient DATABASE_URL) has configured.
    """

    @pytest.fixture()
    def pg_url(self):
        base_url = os.environ["TEST_POSTGRES_URL"]
        from sqlalchemy import create_engine, text

        db_name = f"mmr_migration_test_{uuid.uuid4().hex[:12]}"
        admin_engine = create_engine(base_url)
        with admin_engine.connect() as conn:
            conn.execute(text("COMMIT"))  # exit any implicit transaction before CREATE DATABASE
            conn.execute(text(f'CREATE DATABASE "{db_name}"'))
        admin_engine.dispose()

        # Rebuild the URL pointing at the fresh throwaway database.
        from sqlalchemy.engine import make_url

        url = make_url(base_url).set(database=db_name)
        yield str(url)

        cleanup_engine = create_engine(base_url)
        with cleanup_engine.connect() as conn:
            conn.execute(text("COMMIT"))
            conn.execute(text(f'DROP DATABASE IF EXISTS "{db_name}"'))
        cleanup_engine.dispose()

    def _run_alembic_upgrade(self, database_url):
        from alembic.config import Config
        from alembic import command

        backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
        alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
        alembic_cfg.set_main_option(
            "script_location", os.path.join(backend_dir, "alembic")
        )
        # ConfigParser (which backs alembic.config.Config) treats "%" as its
        # interpolation escape char — double it so a URL-encoded socket path
        # (host=%2Ftmp%2F...) round-trips correctly.
        alembic_cfg.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))

        # backend/alembic/env.py reads DATABASE_URL from os.environ directly
        # (ignoring the Config object) — and conftest.py force-pins that to
        # sqlite for the rest of the suite. Override it for just this call,
        # then restore, so this is the only place a real Postgres URL is
        # ever exposed to env.py, and only for the duration of this call.
        previous = os.environ.get("DATABASE_URL")
        os.environ["DATABASE_URL"] = database_url
        try:
            command.upgrade(alembic_cfg, "head")
        finally:
            if previous is None:
                os.environ.pop("DATABASE_URL", None)
            else:
                os.environ["DATABASE_URL"] = previous

    def test_fresh_database_gets_current_schema(self, pg_url):
        from sqlalchemy import create_engine, inspect

        self._run_alembic_upgrade(pg_url)

        engine = create_engine(pg_url)
        try:
            insp = inspect(engine)
            columns = {c["name"]: c["type"] for c in insp.get_columns("users")}
            assert "id" in columns
            # UUID columns report back as a UUID-flavored type name on Postgres,
            # never "INTEGER" — this is the exact bug that was reproduced live.
            assert "INT" not in str(columns["id"]).upper()
            assert "password_hash" not in columns
        finally:
            engine.dispose()

    def test_preexisting_data_survives_upgrade(self, pg_url):
        """Simulates a database whose schema was created directly (e.g. via
        Supabase) before Alembic ever ran against it — the scenario that made
        the old TRUNCATE migration especially dangerous."""
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from backend.app.models import Base, User

        engine = create_engine(pg_url)
        try:
            Base.metadata.create_all(bind=engine)
            Session = sessionmaker(bind=engine)
            session = Session()
            seeded_id = uuid.uuid4()
            session.add(User(id=seeded_id, name="Real User", email="real@mcgill.ca", university="mcgill"))
            session.commit()
            session.close()

            self._run_alembic_upgrade(pg_url)

            session = Session()
            survivor = session.query(User).filter(User.id == seeded_id).first()
            assert survivor is not None
            assert survivor.email == "real@mcgill.ca"
            session.close()
        finally:
            engine.dispose()

    def test_upgrade_is_idempotent(self, pg_url):
        """Running `upgrade head` twice must not error or duplicate/lose anything."""
        self._run_alembic_upgrade(pg_url)
        self._run_alembic_upgrade(pg_url)  # must not raise
