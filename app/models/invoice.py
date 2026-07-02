from app.extensions import db
from app.models.mixins import TimestampMixin, utc_now


class Invoice(TimestampMixin, db.Model):
    __tablename__ = "invoices"

    __table_args__ = (
        db.CheckConstraint(
            "status IN ('issued', 'cancelled', 'refunded')",
            name="ck_invoices_status",
        ),
        db.CheckConstraint("total_amount >= 0", name="ck_invoices_total_amount_non_negative"),
        db.UniqueConstraint("invoice_number", name="uq_invoices_invoice_number"),
        db.UniqueConstraint("sale_id", name="uq_invoices_sale_id"),
        db.Index("ix_invoices_status", "status"),
        db.Index("ix_invoices_issued_at", "issued_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey("sales.id", ondelete="RESTRICT"), nullable=False)
    invoice_number = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="issued")
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    issued_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    sale = db.relationship("Sale", back_populates="invoice")