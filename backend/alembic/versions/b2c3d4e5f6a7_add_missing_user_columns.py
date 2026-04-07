"""add_missing_user_columns

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-07

Adds share_token and last_seen to existing users table if they don't exist.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name, column_name):
    bind = op.get_bind()
    insp = inspect(bind)
    columns = [c['name'] for c in insp.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    if not column_exists('users', 'share_token'):
        op.add_column('users', sa.Column('share_token', sa.String(), nullable=True))
        op.create_index(op.f('ix_users_share_token'), 'users', ['share_token'], unique=True)

    if not column_exists('users', 'last_seen'):
        op.add_column('users', sa.Column('last_seen', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'last_seen')
    op.drop_index(op.f('ix_users_share_token'), table_name='users')
    op.drop_column('users', 'share_token')
