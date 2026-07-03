"""add checkout payment metadata to sales

Revision ID: a7c9d2e4f6b8
Revises: 9d4f7b2c8a31
Create Date: 2026-07-02 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = "a7c9d2e4f6b8"
down_revision = "9d4f7b2c8a31"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("sales", schema=None) as batch_op:
        batch_op.add_column(sa.Column("billing_address", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("payment_method", sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column("payment_reference", sa.String(length=100), nullable=True))


def downgrade():
    with op.batch_alter_table("sales", schema=None) as batch_op:
        batch_op.drop_column("payment_reference")
        batch_op.drop_column("payment_method")
        batch_op.drop_column("billing_address")
