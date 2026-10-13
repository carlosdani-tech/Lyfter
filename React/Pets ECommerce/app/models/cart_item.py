from app.extensions import db
from app.models.mixins import TimestampMixin


class CartItem(TimestampMixin, db.Model):
    __tablename__ = "cart_items"

    __table_args__ = (
        db.CheckConstraint("quantity > 0", name="ck_cart_items_quantity_positive"),
        db.UniqueConstraint("cart_id", "product_id", name="uq_cart_items_cart_product"),
        db.Index("ix_cart_items_product_id", "product_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    cart_id = db.Column(db.Integer, db.ForeignKey("carts.id", ondelete="CASCADE"), nullable=False)
    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity = db.Column(db.Integer, nullable=False, default=1)

    cart = db.relationship("Cart", back_populates="items")
    product = db.relationship("Product", back_populates="cart_items")