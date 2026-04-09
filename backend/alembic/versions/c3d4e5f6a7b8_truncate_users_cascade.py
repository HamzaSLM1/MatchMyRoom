"""truncate_users_cascade

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-07

Clears all user accounts and dependent data by truncating the users table
with CASCADE, which also removes rows from questionnaire_responses, matches,
likes, messages, password_reset_tokens, blocks, and reports.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("TRUNCATE users CASCADE;")


def downgrade() -> None:
    pass
