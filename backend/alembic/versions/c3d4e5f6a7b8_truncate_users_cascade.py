"""truncate_users_cascade

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-07

NEUTRALIZED (2026-09-21): this revision originally ran `TRUNCATE users
CASCADE`, wiping every user and all dependent data (questionnaire_responses,
matches, likes, messages, password_reset_tokens, blocks, reports) whenever
this revision was applied. That is unacceptable for a migration that runs
automatically on startup (see backend/app/database.py::init_db()). The
revision node is kept (removing it from the middle of the chain would break
the down_revision links for anything already stamped past it) but upgrade()
is now a no-op. Do not restore the TRUNCATE.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
