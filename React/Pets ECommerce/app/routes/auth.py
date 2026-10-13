from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.decorators.auth import admin_required, get_current_user
from app.schemas.auth_schema import validate_login_payload, validate_register_payload
from app.services.auth_service import AuthError, AuthService, serialize_user
from app.utils.responses import error_response, success_response

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.get("/health")
def auth_health():
    return {"module": "auth", "status": "ok"}


@auth_bp.post("/register")
def register_user():
    try:
        payload = validate_register_payload(request.get_json(silent=True))
        data = AuthService.register_user(payload)
    except ValueError as error:
        return error_response("Invalid request payload.", 400, error.args[0])
    except AuthError as error:
        return error_response(error.message, error.status_code)

    return success_response(data, 201)


@auth_bp.post("/login")
def login_user():
    try:
        payload = validate_login_payload(request.get_json(silent=True))
        data = AuthService.login_user(payload)
    except ValueError as error:
        return error_response("Invalid request payload.", 400, error.args[0])
    except AuthError as error:
        return error_response(error.message, error.status_code)

    return success_response(data)


@auth_bp.get("/me")
@jwt_required()
def get_me():
    user = get_current_user()
    if not user:
        return error_response("User not found.", 404)

    return success_response({"user": serialize_user(user)})


@auth_bp.get("/admin-check")
@admin_required
def admin_check():
    return success_response({"module": "auth", "permission": "admin"})