"""add last_activity_at

Revision ID: 98bad3f7ae63
Revises: 47e1f8e9eec8
Create Date: 2026-03-19 22:34:45.019632

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '98bad3f7ae63'
down_revision: Union[str, Sequence[str], None] = '47e1f8e9eec8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('projects', sa.Column('last_activity_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('projects', 'last_activity_at')
