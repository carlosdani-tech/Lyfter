from app.extensions import db
from app.models.mixins import TimestampMixin


class Product(TimestampMixin, db.Model):
    __tablename__ = "products"

    __table_args__ = (
        db.CheckConstraint("price >= 0", name="ck_products_price_non_negative"),
        db.CheckConstraint("stock >= 0", name="ck_products_stock_non_negative"),
        db.Index("ix_products_name", "name"),
        db.Index("ix_products_is_active", "is_active"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=0)
    image_url = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    cart_items = db.relationship("CartItem", back_populates="product")
    sale_items = db.relationship("SaleItem", back_populates="product")
