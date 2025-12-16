"""Add composite index for session_id and event_type

Revision ID: 2f006585ba26
Revises: 7a68f9f422f2
Create Date: 2025-12-16 18:00:14.832416

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2f006585ba26'
down_revision: Union[str, None] = '7a68f9f422f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add composite index on (session_id, event_type) for telemetry_events table.

    This significantly improves query performance when filtering by both session_id
    and event_type, which is common in analytics queries that need only DOWN events
    or only UP events.

    Performance impact:
    - Before: PostgreSQL uses idx_telemetry_session_id, then scans all session events
    - After: PostgreSQL directly jumps to matching (session_id, event_type) rows

    Example query:
    SELECT * FROM telemetry_events
    WHERE session_id = 123 AND event_type = 'DOWN'

    For a session with 5,000 events (2,500 DOWN + 2,500 UP):
    - Before: Scans 5,000 rows, returns 2,500
    - After: Scans 2,500 rows, returns 2,500 (50% reduction)
    """
    op.create_index(
        'idx_telemetry_session_event_type',
        'telemetry_events',
        ['session_id', 'event_type'],
        unique=False
    )


def downgrade() -> None:
    """Remove the composite index if rolling back."""
    op.drop_index('idx_telemetry_session_event_type', table_name='telemetry_events')
