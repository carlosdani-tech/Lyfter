from app.extensions import db
from app.models.mixins import TimestampMixin


class SaleItem(TimestampMixin, db.Model):
    __tablename__ = "sale_items"

    __table_args__ = (
        db.CheckConstraint("quantity > 0", name="ck_sale_items_quantity_positive"),
        db.CheckConstraint("unit_price >= 0", name="ck_sale_items_unit_price_non_negative"),
        db.CheckConstraint("line_total >= 0", name="ck_sale_items_line_total_non_negative"),
        db.UniqueConstraint("sale_id", "product_id", name="uq_sale_items_sale_product"),
        db.Index("ix_sale_items_product_id", "product_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    line_total = db.Column(db.Numeric(10, 2), nullable=False)

    sale = db.relationship("Sale", back_populates="items")
    product = db.relationship("Product", back_populates="sale_items")