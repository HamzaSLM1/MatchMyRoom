"""baseline_schema_v2

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-04-07

REWRITTEN (2026-09-21): this revision originally hand-wrote `create_table`
calls for an old, pre-Supabase schema (integer `users.id`, `password_hash`,
`email_verified`, verification-code columns). That schema has not matched
`backend/app/models.py` since the move to Supabase Auth (UUID `users.id`, no
password columns). Anyone running `alembic upgrade head` against a fresh
database would get a schema the ORM cannot use at all.

This now builds the schema straight from `Base.metadata` with
`checkfirst=True` (SQLAlchemy's default), so it:
  - creates every current table/column on a genuinely empty database, and
  - is a no-op for any table that already exists (e.g. a database whose
    schema was created directly against Supabase, outside Alembic).

Caveat this migration does NOT handle: if a real database already has a
`users` table under the OLD integer-id/password-hash shape, `create_all`
will see the table exists and silently do nothing — it will not detect or
repair the mismatch, and it will not migrate any such rows to UUID ids.
That requires an explicit, reviewed mapping decision (see the production
readiness audit, "P0 — Destructive startup and incompatible migration
history"). Confirm production's actual `users.id` column type before
relying on this migration there.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Import here (not at module scope) so this file has no import-time
    # dependency on the app package beyond what Alembic's env.py already sets up.
    from app.models import Base

    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    from app.models import Base

    Base.metadata.drop_all(bind=op.get_bind())
