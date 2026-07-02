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
        db.Index("ix_sales_user_id", "user_id"),
        db.Index("ix_sales_status", "status"),
        db.Index("ix_sales_created_at", "created_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    cart_id = db.Column(db.Integer, db.ForeignKey("carts.id", ondelete="SET NULL"), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="completed")
    subtotal_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    tax_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    billing_address = db.Column(db.String(500), nullable=True)
    payment_method = db.Column(db.String(30), nullable=True)
    payment_reference = db.Column(db.String(100), nullable=True)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    cancelled_at = db.Column(db.DateTime(timezone=True), nullable=True)
    returned_at = db.Column(db.DateTime(timezone=True), nullable=True)

    user = db.relationship("User", back_populates="sales")
    cart = db.relationship("Cart", back_populates="sale")
    items = db.relationship(
        "SaleItem",
        back_populates="sale",
        cascade="all, delete-orphan",
    )
    invoice = db.relationship("Invoice", back_populates="sale", uselist=False)