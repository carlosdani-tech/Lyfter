from flask import current_app
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import ADMIN_ROLE, CLIENT_ROLE


class SeedConflictError(RuntimeError):
    pass


def _ensure_seed_user(
    *,
    email_config_name: str,
    password_config_name: str,
    role_name: str,
    role_description: str,
    first_name: str | None,
    last_name: str | None,
) -> None:
    email = current_app.config[email_config_name].strip().lower()
    existing_user = UserRepository.get_by_email(email)
    role = RoleRepository.get_or_create(role_name, role_description)

    if existing_user:
        if existing_user.role_id != role.id:
            raise SeedConflictError(
                f"Seed user role conflict for {email_config_name}",
            )
        return

    UserRepository.create(
        email=email,
        password_hash=generate_password_hash(
            current_app.config[password_config_name],
        ),
        role_id=role.id,
        first_name=first_name,
        last_name=last_name,
    )


def seed_development_users() -> None:
    client_first_name = current_app.config["CLIENT_SEED_FIRST_NAME"].strip() or None
    client_last_name = current_app.config["CLIENT_SEED_LAST_NAME"].strip() or None

    try:
        _ensure_seed_user(
            email_config_name="ADMIN_SEED_EMAIL",
            password_config_name="ADMIN_SEED_PASSWORD",
            role_name=ADMIN_ROLE,
            role_description="Administrator user",
            first_name="Admin",
            last_name="User",
        )
        _ensure_seed_user(
            email_config_name="CLIENT_SEED_EMAIL",
            password_config_name="CLIENT_SEED_PASSWORD",
            role_name=CLIENT_ROLE,
            role_description="Client user",
            first_name=client_first_name,
            last_name=client_last_name,
        )
        db.session.commit()
    except SeedConflictError:
        db.session.rollback()
        raise
    except SQLAlchemyError:
        db.session.rollback()
