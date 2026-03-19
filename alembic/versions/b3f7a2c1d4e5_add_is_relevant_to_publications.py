"""add is_relevant to publications

Revision ID: b3f7a2c1d4e5
Revises: ade2084af9cd
Create Date: 2026-03-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b3f7a2c1d4e5"
down_revision: Union[str, None] = "ade2084af9cd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("publications", sa.Column("is_relevant", sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column("publications", "is_relevant")
