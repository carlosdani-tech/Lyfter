from app.extensions import db
from app.models.mixins import TimestampMixin


class Sale(TimestampMixin, db.Model):
    __tablename__ = "sales"

    __table_args__ = (
        db.CheckConstraint(
            "status IN ('completed', 'cancelled', 'returned')",
            name="ck_sales_status",
        ),
        db.CheckConstraint("subtotal_amount >= 0", name="ck_sales_subtotal_amount_non_negative"),
        db.CheckConstraint("tax_amount >= 0", name="ck_sales_tax_amount_non_negative"),
        db.CheckConstraint("total_amount >= 0", name="ck_sales_total_amount_non_negative"),
        db.UniqueConstraint("cart_id", name="uq_sales_cart_id"),
        db.UniqueConstraint("user_id", "idempotency_key", name="uq_sales_user_checkout_key"),
        db.CheckConstraint(
            "idempotency_key IS NULL OR (length(idempotency_key) BETWEEN 1 AND 128 "
            "AND request_fingerprint IS NOT NULL AND length(request_fingerprint) = 64 "
            "AND full_name IS NOT NULL AND length(trim(full_name)) > 0 "
            "AND buyer_email IS NOT NULL AND length(trim(buyer_email)) > 0 "
            "AND shipping_address IS NOT NULL AND completed_at IS NOT NULL "
            "AND total_amount = subtotal_amount + tax_amount)",
            name="ck_sales_checkout_snapshot",
        ),
        db.Index("ix_sales_user_id", "user_id"),
        db.Index("ix_sales_status", "status"),
        db.Index("ix_sales_created_at", "created_at"),
        db.CheckConstraint(
            "email_status IN ('pending', 'sent', 'failed')",
            name="ck_sales_email_status",
        ),
        db.CheckConstraint(
            "email_attempts BETWEEN 0 AND 3",
            name="ck_sales_email_attempts",
        ),
        db.CheckConstraint(
            "email_error_code IS NULL OR email_error_code IN ('disabled', 'configuration', "
            "'invalid_address', 'authentication', 'connection', 'secure_connection', "
            "'rejected', 'delivery_unknown')",
            name="ck_sales_email_error_code",
        ),
        db.CheckConstraint(
            "(email_status != 'sent' OR (email_sent_at IS NOT NULL AND email_attempts > 0)) "
            "AND (NOT email_in_flight OR (email_status = 'pending' AND email_attempts > 0 "
            "AND email_last_attempt_at IS NOT NULL))",
            name="ck_sales_email_delivery_state",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    cart_id = db.Column(db.Integer, db.ForeignKey("carts.id", ondelete="SET NULL"), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="completed")
    subtotal_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    tax_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    idempotency_key = db.Column(db.String(128), nullable=True)
    request_fingerprint = db.Column(db.String(64), nullable=True)
    full_name = db.Column(db.String(200), nullable=True)
    buyer_email = db.Column(db.String(254), nullable=True)
    shipping_address = db.Column(db.JSON, nullable=True)
    email_status = db.Column(
        db.String(10), nullable=False, default="pending", server_default="pending"
    )
    email_attempts = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    email_in_flight = db.Column(
        db.Boolean, nullable=False, default=False, server_default=db.false()
    )
    email_last_attempt_at = db.Column(db.DateTime(timezone=True), nullable=True)
    email_sent_at = db.Column(db.DateTime(timezone=True), nullable=True)
    email_error_code = db.Column(db.String(32), nullable=True)
    cancelled_at = db.Column(db.DateTime(timezone=True), nullable=True)
    returned_at = db.Column(db.DateTime(timezone=True), nullable=True)

    user = db.relationship("User", back_populates="sales")
    cart = db.relationship("Cart", back_populates="sale")
    items = db.relationship(
        "SaleItem",
        back_populates="sale",
        cascade="all, delete-orphan",
        order_by="SaleItem.id",
    )
    invoice = db.relationship("Invoice", back_populates="sale", uselist=False)
