"""add product category

Revision ID: a83c1e7d4f20
Revises: 9d4f7b2c8a31
Create Date: 2026-09-28 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "a83c1e7d4f20"
down_revision = "9d4f7b2c8a31"
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    return any(
        column["name"] == column_name
        for column in inspector.get_columns(table_name)
    )


def upgrade():
    if not _column_exists("products", "category"):
        op.add_column(
            "products",
            sa.Column("category", sa.String(length=100), nullable=True),
        )


def downgrade():
    if _column_exists("products", "category"):
        op.drop_column("products", "category")