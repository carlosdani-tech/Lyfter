from flask import Blueprint
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.services.auth_service import ADMIN_ROLE, CLIENT_ROLE
from app.services.sale_service import SaleError, SaleService
from app.utils.responses import error_response, success_response

sales_bp = Blueprint("sales", __name__, url_prefix="/sales")


def _current_user_context() -> tuple[int, str]:
    return int(get_jwt_identity()), str(get_jwt().get("role") or "")


@sales_bp.get("/health")
def sales_health():
    return {"module": "sales", "status": "ok"}


@sales_bp.post("/checkout")
@jwt_required()
def checkout():
    user_id, role = _current_user_context()
    if role != CLIENT_ROLE:
        return error_response("Client permission is required.", 403)

    try:
        data = SaleService.checkout(user_id)
    except SaleError as error:
        return error_response(error.message, error.status_code)

    return success_response(data, 201)


@sales_bp.post("/<int:sale_id>/cancel")
@jwt_required()
def cancel_sale(sale_id: int):
    user_id, role = _current_user_context()
    try:
        data = SaleService.cancel_sale(
            sale_id,
            user_id=user_id,
            is_admin=role == ADMIN_ROLE,
        )
    except SaleError as error:
        return error_response(error.message, error.status_code)

    return success_response(data)


@sales_bp.post("/<int:sale_id>/return")
@jwt_required()
def return_sale(sale_id: int):
    user_id, role = _current_user_context()
    try:
        data = SaleService.return_sale(
            sale_id,
            user_id=user_id,
            is_admin=role == ADMIN_ROLE,
        )
    except SaleError as error:
        return error_response(error.message, error.status_code)

    return success_response(data)

