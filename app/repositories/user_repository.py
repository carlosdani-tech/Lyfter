from typing import Any, cast

from app.extensions import db
from app.models import Role, User


class UserRepository:
    @staticmethod
    def list_all() -> list[User]:
        return db.session.query(User).order_by(User.id.asc()).all()

    @staticmethod
    def get_by_id(user_id: int) -> User | None:
        return db.session.get(User, user_id)

    @staticmethod
    def get_by_email(email: str) -> User | None:
        return db.session.query(User).filter(User.email == email).one_or_none()

    @staticmethod
    def create(
        *,
        email: str,
        password_hash: str,
        role_id: int,
        first_name: str | None = None,
        last_name: str | None = None,
    ) -> User:
        user = cast(Any, User)(
            email=email,
            password_hash=password_hash,
            role_id=role_id,
            first_name=first_name,
            last_name=last_name,
        )
        db.session.add(user)
        db.session.flush()
        return user

    @staticmethod
    def update(user: User, **user_data) -> User:
        for field, value in user_data.items():
            setattr(user, field, value)

        db.session.flush()
        return user

    @staticmethod
    def deactivate(user: User) -> User:
        user.is_active = False
        db.session.flush()
        return user

    @staticmethod
    def count_active_admins() -> int:
        return (
            db.session.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.is_active.is_(True), Role.name == "admin")
            .count()
        )
