"""Add theme column to users table

Revision ID: ac52eb30091f
Revises: 43ef406192ea
Create Date: 2025-12-16 09:16:57.706374

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ac52eb30091f'
down_revision: Union[str, None] = '43ef406192ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Add column as nullable
    op.add_column('users', sa.Column('theme', sa.String(length=50), nullable=True, server_default='default', comment="UI theme preference: 'default', 'cyberpunk', 'paper', 'high-contrast'"))
    
    # Step 2: Update existing records with default value
    op.execute("UPDATE users SET theme = 'default' WHERE theme IS NULL")
    
    # Step 3: Make column non-nullable
    op.alter_column('users', 'theme', nullable=False, server_default=None)


def downgrade() -> None:
    op.drop_column('users', 'theme')
