"""add missing product image url

Revision ID: 9d4f7b2c8a31
Revises: 570d6d55b1ea
Create Date: 2026-06-30 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "9d4f7b2c8a31"
down_revision = "570d6d55b1ea"
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade():
    if not _column_exists("products", "image_url"):
        op.add_column("products", sa.Column("image_url", sa.String(length=500), nullable=True))


def downgrade():
    if _column_exists("products", "image_url"):
        op.drop_column("products", "image_url")
