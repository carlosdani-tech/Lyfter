from app.extensions import db
from app.repositories.user_repository import UserRepository
from app.services.auth_service import ADMIN_ROLE, serialize_user


class UserError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class UserService:
    @staticmethod
    def list_users() -> dict:
        users = UserRepository.list_all()
        return {"users": [serialize_user(user) for user in users]}

    @staticmethod
    def get_user(user_id: int) -> dict:
        user = UserRepository.get_by_id(user_id)
        if not user:
            raise UserError("User not found.", 404)

        return {"user": serialize_user(user)}

    @staticmethod
    def update_user(user_id: int, payload: dict) -> dict:
        user = UserRepository.get_by_id(user_id)
        if not user:
            raise UserError("User not found.", 404)

        email = payload.get("email")
        if email and email != user.email:
            existing_user = UserRepository.get_by_email(email)
            if existing_user:
                raise UserError("Email is already registered.", 409)

        if payload.get("is_active") is False:
            UserService._ensure_not_last_active_admin(user)

        updated_user = UserRepository.update(user, **payload)
        db.session.commit()
        return {"user": serialize_user(updated_user)}

    @staticmethod
    def deactivate_user(user_id: int) -> dict:
        user = UserRepository.get_by_id(user_id)
        if not user:
            raise UserError("User not found.", 404)

        UserService._ensure_not_last_active_admin(user)
        deactivated_user = UserRepository.deactivate(user)
        db.session.commit()
        return {"user": serialize_user(deactivated_user)}

    @staticmethod
    def _ensure_not_last_active_admin(user) -> None:
        if user.role.name != ADMIN_ROLE or not user.is_active:
            return

        if UserRepository.count_active_admins() <= 1:
            raise UserError("Cannot deactivate the last active admin.", 400)
