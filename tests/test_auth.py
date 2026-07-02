from werkzeug.security import check_password_hash

from app.decorators.auth import ownership_required
from app.extensions import db
from app.models import Role, User
from app.services.auth_service import ADMIN_ROLE, CLIENT_ROLE
from app.utils.responses import success_response
from tests.conftest import auth_header, create_user, login_user


def test_register_user_hashes_password_and_returns_client_role(client):
    response = client.post(
        "/auth/register",
        json={
            "email": "Client@Example.com",
            "password": "Password123",
            "first_name": "Test",
            "last_name": "Client",
        },
    )

    assert response.status_code == 201
    body = response.get_json()["data"]
    user_data = body["user"]

    assert user_data["email"] == "client@example.com"
    assert user_data["role"] == CLIENT_ROLE
    assert "password_hash" not in user_data

    user = db.session.query(User).filter(User.email == "client@example.com").one()
    assert user.password_hash != "Password123"
    assert check_password_hash(user.password_hash, "Password123")

    role = db.session.query(Role).filter(Role.name == CLIENT_ROLE).one()
    assert role.id == user.role_id


def test_register_rejects_duplicate_email(client):
    payload = {"email": "duplicate@example.com", "password": "Password123"}

    first_response = client.post("/auth/register", json=payload)
    second_response = client.post("/auth/register", json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409


def test_register_validates_payload(client):
    response = client.post("/auth/register", json={"email": "bad", "password": "short"})

    assert response.status_code == 400
    details = response.get_json()["error"]["details"]
    assert "email" in details
    assert "password" in details


def test_login_returns_jwt_and_user_without_password_hash(client):
    create_user("client@example.com", CLIENT_ROLE)

    response = client.post(
        "/auth/login",
        json={"email": "client@example.com", "password": "Password123"},
    )

    assert response.status_code == 200
    data = response.get_json()["data"]

    assert data["token_type"] == "Bearer"
    assert data["access_token"]
    assert data["user"]["role"] == CLIENT_ROLE
    assert "password_hash" not in data["user"]


def test_login_rejects_invalid_password(client):
    create_user("client@example.com", CLIENT_ROLE)

    response = client.post(
        "/auth/login",
        json={"email": "client@example.com", "password": "WrongPassword123"},
    )

    assert response.status_code == 401


def test_me_returns_current_user(client):
    create_user("client@example.com", CLIENT_ROLE)
    token = login_user(client, "client@example.com")

    response = client.get("/auth/me", headers=auth_header(token))

    assert response.status_code == 200
    user_data = response.get_json()["data"]["user"]
    assert user_data["email"] == "client@example.com"
    assert "password_hash" not in user_data


def test_client_cannot_access_admin_endpoint(client):
    create_user("client@example.com", CLIENT_ROLE)
    token = login_user(client, "client@example.com")

    response = client.get("/auth/admin-check", headers=auth_header(token))

    assert response.status_code == 403


def test_admin_can_access_admin_endpoint(client):
    create_user("admin@example.com", ADMIN_ROLE)
    token = login_user(client, "admin@example.com")

    response = client.get("/auth/admin-check", headers=auth_header(token))

    assert response.status_code == 200
    assert response.get_json()["data"] == {"module": "auth", "permission": "admin"}


def test_ownership_required_allows_owner_and_admin(app, client):
    @app.get("/test/users/<int:user_id>/private")
    @ownership_required("user_id")
    def private_user_resource(user_id: int):
        return success_response({"user_id": user_id})

    owner = create_user("owner@example.com", CLIENT_ROLE)
    other_user = create_user("other@example.com", CLIENT_ROLE)
    create_user("admin@example.com", ADMIN_ROLE)

    owner_token = login_user(client, "owner@example.com")
    admin_token = login_user(client, "admin@example.com")

    owner_response = client.get(
        f"/test/users/{owner.id}/private",
        headers=auth_header(owner_token),
    )
    forbidden_response = client.get(
        f"/test/users/{other_user.id}/private",
        headers=auth_header(owner_token),
    )
    admin_response = client.get(
        f"/test/users/{other_user.id}/private",
        headers=auth_header(admin_token),
    )

    assert owner_response.status_code == 200
    assert forbidden_response.status_code == 403
    assert admin_response.status_code == 200
    assert admin_response.get_json()["data"] == {"user_id": other_user.id}