from decimal import Decimal

from app.extensions import db
from app.repositories.cart_repository import CartRepository
from app.repositories.product_repository import ProductRepository


class CartError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _money(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.01")))


def serialize_cart_item(item) -> dict:
    unit_price = item.product.price
    line_total = unit_price * item.quantity
    return {
        "id": item.id,
        "product_id": item.product_id,
        "name": item.product.name,
        "unit_price": _money(unit_price),
        "quantity": item.quantity,
        "line_total": _money(line_total),
    }


def serialize_cart(cart) -> dict:
    items = [serialize_cart_item(item) for item in cart.items if item.product.is_active]
    subtotal = sum((Decimal(item["line_total"]) for item in items), Decimal("0.00"))
    total = subtotal

    return {
        "id": cart.id,
        "user_id": cart.user_id,
        "status": cart.status,
        "items": items,
        "subtotal": _money(subtotal),
        "total": _money(total),
        "created_at": cart.created_at.isoformat() if cart.created_at else None,
        "updated_at": cart.updated_at.isoformat() if cart.updated_at else None,
    }


class CartService:
    @staticmethod
    def get_active_cart(user_id: int) -> dict:
        cart = CartRepository.get_or_create_active(user_id)
        db.session.commit()
        return {"cart": serialize_cart(cart)}

    @staticmethod
    def add_product(user_id: int, payload: dict) -> dict:
        product = ProductRepository.get_by_id(payload["product_id"])
        if not product or not product.is_active:
            raise CartError("Product not found.", 404)

        cart = CartRepository.get_or_create_active(user_id)
        item = CartRepository.get_item(cart.id, product.id)
        requested_quantity = payload["quantity"]
        new_quantity = requested_quantity if not item else item.quantity + requested_quantity

        if new_quantity > product.stock:
            raise CartError("Quantity cannot be greater than available stock.", 400)

        if item:
            CartRepository.update_item_quantity(item, new_quantity)
        else:
            CartRepository.add_item(cart.id, product.id, requested_quantity)

        db.session.commit()
        return {"cart": serialize_cart(cart)}

    @staticmethod
    def update_item(user_id: int, item_id: int, payload: dict) -> dict:
        item = CartRepository.get_item_by_id(item_id)
        if not item:
            raise CartError("Cart item not found.", 404)

        if item.cart.user_id != user_id:
            raise CartError("You cannot access this cart item.", 403)

        if item.cart.status != "active":
            raise CartError("Cart item not found.", 404)

        if not item.product.is_active:
            raise CartError("Product not found.", 404)

        quantity = payload["quantity"]
        if quantity > item.product.stock:
            raise CartError("Quantity cannot be greater than available stock.", 400)

        CartRepository.update_item_quantity(item, quantity)
        db.session.commit()
        return {"cart": serialize_cart(item.cart)}

    @staticmethod
    def remove_item(user_id: int, item_id: int) -> dict:
        item = CartRepository.get_item_by_id(item_id)
        if not item:
            raise CartError("Cart item not found.", 404)

        if item.cart.user_id != user_id:
            raise CartError("You cannot access this cart item.", 403)

        if item.cart.status != "active":
            raise CartError("Cart item not found.", 404)

        cart = item.cart
        CartRepository.remove_item(item)
        db.session.commit()
        return {"cart": serialize_cart(cart)}

