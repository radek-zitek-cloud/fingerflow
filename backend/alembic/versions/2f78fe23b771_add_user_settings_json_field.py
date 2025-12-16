"""add_user_settings_json_field

Revision ID: 2f78fe23b771
Revises: ac52eb30091f
Create Date: 2025-12-16 13:22:35.253210

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2f78fe23b771"
down_revision: Union[str, None] = "ac52eb30091f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Add settings column as nullable JSONB
    op.add_column("users", sa.Column("settings", sa.JSON(), nullable=True))

    # Step 2: Migrate existing theme values into settings JSON (PostgreSQL syntax)
    # Default settings structure includes theme and typing session config
    op.execute("""
        UPDATE users
        SET settings = jsonb_build_object(
            'theme', theme,
            'sessionMode', 'wordcount',
            'timedDuration', 30,
            'wordCount', 20,
            'viewMode', 'ticker',
            'selectedWordSetId', NULL
        )
    """)

    # Step 3: Make settings non-nullable
    op.alter_column("users", "settings", nullable=False)


def downgrade() -> None:
    # Remove settings column (theme column still exists for backward compatibility)
    op.drop_column("users", "settings")
