"""add_practice_text_to_sessions

Revision ID: 7a68f9f422f2
Revises: cf063aeadd60
Create Date: 2025-12-16 14:32:43.461212

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a68f9f422f2'
down_revision: Union[str, None] = 'cf063aeadd60'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add practice_text column to typing_sessions table
    # Nullable to support existing sessions that don't have this data
    op.add_column(
        "typing_sessions",
        sa.Column("practice_text", sa.Text(), nullable=True, comment="The practice text that was typed in this session")
    )


def downgrade() -> None:
    # Remove practice_text column
    op.drop_column("typing_sessions", "practice_text")
