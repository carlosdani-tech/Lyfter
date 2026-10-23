"""Add checkout snapshots, owner-scoped idempotency and active-cart uniqueness.

Revision ID: b72e4a9f1036
Revises: a83c1e7d4f20
"""

import sqlalchemy as sa
from alembic import op

revision = "b72e4a9f1036"
down_revision = "a83c1e7d4f20"
branch_labels = None
depends_on = None


def upgrade():
    # Fail without changing/deleting historical carts if manual reconciliation is needed.
    duplicate = (
        op.get_bind()
        .execute(
            sa.text(
                "SELECT 1 FROM carts WHERE status = 'active' GROUP BY user_id HAVING count(*) > 1"
            )
        )
        .first()
    )
    if duplicate:
        raise RuntimeError("Duplicate active carts require reviewed reconciliation before upgrade.")
    op.add_column("sales", sa.Column("idempotency_key", sa.String(128), nullable=True))
    op.add_column("sales", sa.Column("request_fingerprint", sa.String(64), nullable=True))
    op.add_column("sales", sa.Column("full_name", sa.String(200), nullable=True))
    op.add_column("sales", sa.Column("buyer_email", sa.String(254), nullable=True))
    op.add_column("sales", sa.Column("shipping_address", sa.JSON(), nullable=True))
    op.add_column("sale_items", sa.Column("product_name", sa.String(150), nullable=True))
    op.create_unique_constraint(
        "uq_sales_user_checkout_key",
        "sales",
        ["user_id", "idempotency_key"],
    )
    op.create_check_constraint(
        "ck_sales_checkout_snapshot",
        "sales",
        "idempotency_key IS NULL OR (length(idempotency_key) BETWEEN 1 AND 128 "
        "AND request_fingerprint IS NOT NULL AND length(request_fingerprint) = 64 "
        "AND full_name IS NOT NULL AND length(trim(full_name)) > 0 "
        "AND buyer_email IS NOT NULL AND length(trim(buyer_email)) > 0 "
        "AND shipping_address IS NOT NULL AND completed_at IS NOT NULL "
        "AND total_amount = subtotal_amount + tax_amount)",
    )
    op.create_check_constraint(
        "ck_sale_items_snapshot",
        "sale_items",
        "product_name IS NULL OR (length(trim(product_name)) > 0 "
        "AND line_total = round(unit_price * quantity, 2))",
    )
    op.create_index(
        "uq_carts_active_user",
        "carts",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
        sqlite_where=sa.text("status = 'active'"),
    )


def downgrade():
    raise RuntimeError(
        "Snapshot removal is destructive and requires a separately reviewed migration."
    )
