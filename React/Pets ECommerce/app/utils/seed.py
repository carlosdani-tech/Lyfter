from flask import current_app
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import ADMIN_ROLE


def seed_admin_user() -> None:
    email = current_app.config["ADMIN_SEED_EMAIL"].strip().lower()
    password = current_app.config["ADMIN_SEED_PASSWORD"]

    if not email or not password:
        return

    try:
        if UserRepository.get_by_email(email):
            return

        role = RoleRepository.get_or_create(ADMIN_ROLE, "Administrator user")
        UserRepository.create(
            email=email,
            password_hash=generate_password_hash(password),
            role_id=role.id,
            first_name="Admin",
            last_name="User",
        )
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
