"""remove_theme_column_use_settings

Revision ID: cf063aeadd60
Revises: 2f78fe23b771
Create Date: 2025-12-16 14:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "cf063aeadd60"
down_revision: Union[str, None] = "2f78fe23b771"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove theme column as it's now in settings JSON
    op.drop_column("users", "theme")


def downgrade() -> None:
    # Restore theme column from settings JSON
    op.add_column("users", sa.Column("theme", sa.String(length=50), nullable=True))
    
    # Populate theme column from settings JSON
    op.execute("""
        UPDATE users
        SET theme = settings->>'theme'
    """)
    
    # Make theme non-nullable with default
    op.alter_column("users", "theme", nullable=False, server_default="default")
