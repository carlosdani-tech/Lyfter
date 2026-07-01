from flask import Blueprint, request
from flask.typing import ResponseReturnValue
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.schemas.cart_schema import (
    validate_add_cart_item_payload,
    validate_update_cart_item_payload,
)
from app.services.auth_service import CLIENT_ROLE
from app.services.cart_service import CartError, CartService
from app.utils.responses import error_response, success_response

cart_bp = Blueprint("cart", __name__, url_prefix="/cart")


def _get_client_user_id() -> tuple[int | None, ResponseReturnValue | None]:
    claims = get_jwt()
    if claims.get("role") != CLIENT_ROLE:
        return None, error_response("Client permission is required.", 403)

    return int(get_jwt_identity()), None


@cart_bp.get("/health")
def cart_health():
    return {"module": "cart", "status": "ok"}


@cart_bp.get("")
@jwt_required()
def get_active_cart():
    user_id, error = _get_client_user_id()
    if error:
        return error

    assert user_id is not None
    data = CartService.get_active_cart(user_id)
    return success_response(data)


@cart_bp.post("/items")
@jwt_required()
def add_cart_item():
    user_id, error = _get_client_user_id()
    if error:
        return error

    assert user_id is not None
    try:
        payload = validate_add_cart_item_payload(request.get_json(silent=True))
        data = CartService.add_product(user_id, payload)
    except ValueError as error:
        return error_response("Invalid request payload.", 400, error.args[0])
    except CartError as error:
        return error_response(error.message, error.status_code)

    return success_response(data, 201)


@cart_bp.put("/items/<int:item_id>")
@jwt_required()
def update_cart_item(item_id: int):
    user_id, error = _get_client_user_id()
    if error:
        return error

    assert user_id is not None
    try:
        payload = validate_update_cart_item_payload(request.get_json(silent=True))
        data = CartService.update_item(user_id, item_id, payload)
    except ValueError as error:
        return error_response("Invalid request payload.", 400, error.args[0])
    except CartError as error:
        return error_response(error.message, error.status_code)

    return success_response(data)


@cart_bp.delete("/items/<int:item_id>")
@jwt_required()
def remove_cart_item(item_id: int):
    user_id, error = _get_client_user_id()
    if error:
        return error

    assert user_id is not None
    try:
        data = CartService.remove_item(user_id, item_id)
    except CartError as error:
        return error_response(error.message, error.status_code)

    return success_response(data)

