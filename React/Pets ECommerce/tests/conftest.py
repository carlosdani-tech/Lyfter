import pytest
from werkzeug.security import generate_password_hash

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import Role, User


class TestConfig(Config):
    TESTING = True
    SECRET_KEY = "test-only-flask-signing-key"
    JWT_SECRET_KEY = "test-only-jwt-signing-key-with-at-least-32-chars"
    ADMIN_SEED_PASSWORD = "test-only-admin-password-123"
    CLIENT_SEED_PASSWORD = "test-only-client-password-456"
    CLIENT_SEED_FIRST_NAME = "Test Client"
    CLIENT_SEED_LAST_NAME = "User"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


@pytest.fixture()
def app():
    test_app = create_app(TestConfig)

    with test_app.app_context():
        db.create_all()
        yield test_app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def create_user(email: str, role_name: str, password: str = "Password123") -> User:
    role = db.session.query(Role).filter(Role.name == role_name).one_or_none()
    if role is None:
        role = Role(name=role_name)
        db.session.add(role)
        db.session.flush()

    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        role_id=role.id,
    )
    db.session.add(user)
    db.session.commit()
    return user


def login_user(client, email: str, password: str = "Password123") -> str:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.get_json()["data"]["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
