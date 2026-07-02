from app.decorators.auth import admin_required
from app.schemas.user_schema import validate_update_user_payload
from app.services.user_service import UserError, UserService
from app.utils.responses import error_response, success_response
from flask import Blueprint, request

users_bp = Blueprint("users", __name__, url_prefix="/users")


@users_bp.get("/health")
def users_health():
    return {"module": "users", "status": "ok"}


@users_bp.get("")
@admin_required
def list_users():
    data = UserService.list_users()
    return success_response(data)


@users_bp.get("/<int:user_id>")
@admin_required
def get_user(user_id: int):
    try:
        data = UserService.get_user(user_id)
    except UserError as error:
        return error_response(error.message, error.status_code)

    return success_response(data)


@users_bp.patch("/<int:user_id>")
@admin_required
def update_user(user_id: int):
    try:
        payload = validate_update_user_payload(request.get_json(silent=True))
        data = UserService.update_user(user_id, payload)
    except ValueError as error:
        return error_response("Invalid request payload.", 400, error.args[0])
    except UserError as error:
        return error_response(error.message, error.status_code)

    return success_response(data)


@users_bp.delete("/<int:user_id>")
@admin_required
def deactivate_user(user_id: int):
    try:
        data = UserService.deactivate_user(user_id)
    except UserError as error:
        return error_response(error.message, error.status_code)

    return success_response(data)
