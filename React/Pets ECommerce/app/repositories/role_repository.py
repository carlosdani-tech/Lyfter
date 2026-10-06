from typing import Any, cast

from app.extensions import db
from app.models import Role


class RoleRepository:
    @staticmethod
    def get_by_name(name: str) -> Role | None:
        return db.session.query(Role).filter(Role.name == name).one_or_none()

    @staticmethod
    def get_or_create(name: str, description: str | None = None) -> Role:
        role = RoleRepository.get_by_name(name)
        if role:
            return role

        role = cast(Any, Role)(name=name, description=description)
        db.session.add(role)
        db.session.flush()
        return role
