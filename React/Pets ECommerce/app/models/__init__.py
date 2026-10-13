from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.invoice import Invoice
from app.models.product import Product
from app.models.role import Role
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.user import User

__all__ = [
    "Cart",
    "CartItem",
    "Invoice",
    "Product",
    "Role",
    "Sale",
    "SaleItem",
    "User",
    "load_models",
]


def load_models() -> None:
    """Ensure SQLAlchemy model metadata is imported for Alembic."""