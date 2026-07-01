from functools import wraps

from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.repositories.user_repository import UserRepository
from app.services.auth_service import ADMIN_ROLE
from app.utils.responses import error_response


def get_current_user():
    identity = get_jwt_identity()
    if identity is None:
        return None

    return UserRepository.get_by_id(int(identity))


def admin_required(view_func):
    @wraps(view_func)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != ADMIN_ROLE:
            return error_response("Admin permission is required.", 403)

        return view_func(*args, **kwargs)

    return wrapper


def current_user_can_access_user(user_id: int) -> bool:
    claims = get_jwt()
    identity = get_jwt_identity()

    if claims.get("role") == ADMIN_ROLE:
        return True

    return str(user_id) == str(identity)


def ownership_required(user_id_param: str = "user_id"):
    def decorator(view_func):
        @wraps(view_func)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = kwargs.get(user_id_param)
            if user_id is None or not current_user_can_access_user(int(user_id)):
                return error_response("You cannot access this resource.", 403)

            return view_func(*args, **kwargs)

        return wrapper

    return decorator