from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository

ADMIN_ROLE = "admin"
CLIENT_ROLE = "client"


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def serialize_user(user) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role.name,
        "is_active": user.is_active,
    }


class AuthService:
    @staticmethod
    def register_user(payload: dict) -> dict:
        existing_user = UserRepository.get_by_email(payload["email"])
        if existing_user:
            raise AuthError("Email is already registered.", 409)

        role = RoleRepository.get_or_create(CLIENT_ROLE, "Client user")
        password_hash = generate_password_hash(payload["password"])

        user = UserRepository.create(
            email=payload["email"],
            password_hash=password_hash,
            role_id=role.id,
            first_name=payload.get("first_name"),
            last_name=payload.get("last_name"),
        )
        db.session.commit()

        return {"user": serialize_user(user)}

    @staticmethod
    def login_user(payload: dict) -> dict:
        user = UserRepository.get_by_email(payload["email"])
        if not user or not user.is_active:
            raise AuthError("Invalid credentials.", 401)

        if not check_password_hash(user.password_hash, payload["password"]):
            raise AuthError("Invalid credentials.", 401)

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.name},
        )

        return {
            "access_token": access_token,
            "token_type": "Bearer",
            "user": serialize_user(user),
        }