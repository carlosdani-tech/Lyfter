"""Add bounded confirmation-email delivery state to sales.

Revision ID: c91f6d2a804e
Revises: b72e4a9f1036
"""

import sqlalchemy as sa
from alembic import op

revision = "c91f6d2a804e"
down_revision = "b72e4a9f1036"
branch_labels = None
depends_on = None


def upgrade():
    # Server defaults keep existing purchases valid without fabricating delivery.
    op.add_column(
        "sales",
        sa.Column("email_status", sa.String(10), nullable=False, server_default="pending"),
    )
    op.add_column(
        "sales",
        sa.Column("email_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "sales",
        sa.Column("email_in_flight", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "sales",
        sa.Column("email_last_attempt_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "sales",
        sa.Column("email_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("sales", sa.Column("email_error_code", sa.String(32), nullable=True))
    op.create_check_constraint(
        "ck_sales_email_status",
        "sales",
        "email_status IN ('pending', 'sent', 'failed')",
    )
    op.create_check_constraint(
        "ck_sales_email_attempts",
        "sales",
        "email_attempts BETWEEN 0 AND 3",
    )
    op.create_check_constraint(
        "ck_sales_email_error_code",
        "sales",
        "email_error_code IS NULL OR email_error_code IN ('disabled', 'configuration', "
        "'invalid_address', 'authentication', 'connection', 'secure_connection', "
        "'rejected', 'delivery_unknown')",
    )
    op.create_check_constraint(
        "ck_sales_email_delivery_state",
        "sales",
        "(email_status != 'sent' OR (email_sent_at IS NOT NULL AND email_attempts > 0)) "
        "AND (NOT email_in_flight OR (email_status = 'pending' AND email_attempts > 0 "
        "AND email_last_attempt_at IS NOT NULL))",
    )


def downgrade():
    raise RuntimeError(
        "Removing email delivery records requires a separately reviewed destructive migration."
    )
