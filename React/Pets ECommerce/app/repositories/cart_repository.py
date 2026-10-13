from typing import Any, cast

from app.extensions import db
from app.models import Cart, CartItem

ACTIVE_CART_STATUS = "active"


class CartRepository:
    @staticmethod
    def get_active_by_user_id(user_id: int) -> Cart | None:
        return (
            db.session.query(Cart)
            .filter(Cart.user_id == user_id, Cart.status == ACTIVE_CART_STATUS)
            .one_or_none()
        )

    @staticmethod
    def create_active(user_id: int) -> Cart:
        cart = cast(Any, Cart)(user_id=user_id, status=ACTIVE_CART_STATUS)
        db.session.add(cart)
        db.session.flush()
        return cart

    @staticmethod
    def get_or_create_active(user_id: int) -> Cart:
        cart = CartRepository.get_active_by_user_id(user_id)
        if cart:
            return cart

        return CartRepository.create_active(user_id)

    @staticmethod
    def get_item(cart_id: int, product_id: int) -> CartItem | None:
        return (
            db.session.query(CartItem)
            .filter(CartItem.cart_id == cart_id, CartItem.product_id == product_id)
            .one_or_none()
        )

    @staticmethod
    def get_item_by_id(item_id: int) -> CartItem | None:
        return db.session.get(CartItem, item_id)

    @staticmethod
    def add_item(cart_id: int, product_id: int, quantity: int) -> CartItem:
        item = cast(Any, CartItem)(cart_id=cart_id, product_id=product_id, quantity=quantity)
        db.session.add(item)
        db.session.flush()
        return item

    @staticmethod
    def update_item_quantity(item: CartItem, quantity: int) -> CartItem:
        item.quantity = quantity
        db.session.flush()
        return item

    @staticmethod
    def remove_item(item: CartItem) -> None:
        db.session.delete(item)
        db.session.flush()
