"""
Shared utility functions for MatchMyRoom backend.
"""
from sqlalchemy.orm import Session
from .models import Block


def get_blocked_user_ids(user_id: int, db: Session) -> set:
    """Returns all user IDs that user_id has blocked OR that have blocked user_id.

    This is bidirectional: if A blocked B or B blocked A, both IDs are excluded
    from each other's matches/messages/threads.
    """
    blocks = db.query(Block).filter(
        (Block.blocker_id == user_id) | (Block.blocked_id == user_id)
    ).all()
    return {b.blocked_id if b.blocker_id == user_id else b.blocker_id for b in blocks}
