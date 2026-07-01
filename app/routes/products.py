from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.decorators.auth import admin_required
from app.schemas.product_schema import (
    validate_create_product_payload,
    validate_update_product_payload,
)
from app.services.product_service import ProductError, ProductService
from app.utils.responses import error_response, success_response

products_bp = Blueprint("products", __name__, url_prefix="/products")


@products_bp.get("/health")
def products_health():
    return {"module": "products", "status": "ok"}


@products_bp.post("")
@admin_required
def create_product():
    try:
        payload = validate_create_product_payload(request.get_json(silent=True))
        data = ProductService.create_product(payload)
    except ValueError as error:
        return error_response("Invalid request payload.", 400, error.args[0])
    except ProductError as error:
        return error_response(error.message, error.status_code)

    return success_response(data, 201)


@products_bp.get("")
@jwt_required()
def list_products():
    data = ProductService.list_products()
    return success_response(data)


@products_bp.get("/<int:product_id>")
@jwt_required()
def get_product(product_id: int):
    try:
        data = ProductService.get_product(product_id)
    except ProductError as error:
        return error_response(error.message, error.status_code)

    return success_response(data)


@products_bp.put("/<int:product_id>")
@admin_required
def update_product(product_id: int):
    try:
        payload = validate_update_product_payload(request.get_json(silent=True))
        data = ProductService.update_product(product_id, payload)
    except ValueError as error:
        return error_response("Invalid request payload.", 400, error.args[0])
    except ProductError as error:
        return error_response(error.message, error.status_code)

    return success_response(data)


@products_bp.delete("/<int:product_id>")
@admin_required
def deactivate_product(product_id: int):
    try:
        data = ProductService.deactivate_product(product_id)
    except ProductError as error:
        return error_response(error.message, error.status_code)

    return success_response(data)
