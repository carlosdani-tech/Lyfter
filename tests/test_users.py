from app.extensions import db
from app.models import User
from app.services.auth_service import ADMIN_ROLE, CLIENT_ROLE
from tests.conftest import auth_header, create_user, login_user


def _admin_token(client, email: str = "admin@example.com") -> str:
    create_user(email, ADMIN_ROLE)
    return login_user(client, email)


def _client_token(client, email: str = "client@example.com") -> str:
    create_user(email, CLIENT_ROLE)
    return login_user(client, email)


def test_admin_can_list_users_without_password_hash(client):
    token = _admin_token(client)
    create_user("client@example.com", CLIENT_ROLE)

    response = client.get("/users", headers=auth_header(token))

    assert response.status_code == 200
    users = response.get_json()["data"]["users"]
    assert [user["email"] for user in users] == ["admin@example.com", "client@example.com"]
    assert all("password_hash" not in user for user in users)


def test_admin_can_get_user_detail_without_password_hash(client):
    token = _admin_token(client)
    user = create_user("client@example.com", CLIENT_ROLE)

    response = client.get(f"/users/{user.id}", headers=auth_header(token))

    assert response.status_code == 200
    user_data = response.get_json()["data"]["user"]
    assert user_data["id"] == user.id
    assert user_data["email"] == "client@example.com"
    assert "password_hash" not in user_data


def test_admin_can_update_allowed_user_fields(client):
    token = _admin_token(client)
    user = create_user("client@example.com", CLIENT_ROLE)

    response = client.patch(
        f"/users/{user.id}",
        json={"email": "Updated@Example.com", "first_name": "Updated", "is_active": True},
        headers=auth_header(token),
    )

    assert response.status_code == 200
    user_data = response.get_json()["data"]["user"]
    assert user_data["email"] == "updated@example.com"
    assert user_data["first_name"] == "Updated"
    assert user_data["is_active"] is True
    assert "password_hash" not in user_data


def test_admin_user_update_rejects_invalid_payload(client):
    token = _admin_token(client)
    user = create_user("client@example.com", CLIENT_ROLE)

    response = client.patch(
        f"/users/{user.id}",
        json={"email": "bad", "password_hash": "unsafe"},
        headers=auth_header(token),
    )

    assert response.status_code == 400
    details = response.get_json()["error"]["details"]
    assert "email" in details
    assert "password_hash" in details


def test_admin_can_deactivate_user(client):
    token = _admin_token(client)
    user = create_user("client@example.com", CLIENT_ROLE)

    response = client.delete(f"/users/{user.id}", headers=auth_header(token))

    assert response.status_code == 200
    user_data = response.get_json()["data"]["user"]
    assert user_data["is_active"] is False
    assert "password_hash" not in user_data
    assert db.session.get(User, user.id).is_active is False


def test_client_cannot_access_user_admin_endpoints(client):
    token = _client_token(client)
    target = create_user("target@example.com", CLIENT_ROLE)

    list_response = client.get("/users", headers=auth_header(token))
    detail_response = client.get(f"/users/{target.id}", headers=auth_header(token))
    update_response = client.patch(
        f"/users/{target.id}",
        json={"first_name": "Blocked"},
        headers=auth_header(token),
    )
    delete_response = client.delete(f"/users/{target.id}", headers=auth_header(token))

    assert list_response.status_code == 403
    assert detail_response.status_code == 403
    assert update_response.status_code == 403
    assert delete_response.status_code == 403


def test_user_admin_endpoints_return_404_for_missing_user(client):
    token = _admin_token(client)

    detail_response = client.get("/users/999", headers=auth_header(token))
    update_response = client.patch(
        "/users/999",
        json={"first_name": "Missing"},
        headers=auth_header(token),
    )
    delete_response = client.delete("/users/999", headers=auth_header(token))

    assert detail_response.status_code == 404
    assert update_response.status_code == 404
    assert delete_response.status_code == 404


def test_admin_cannot_deactivate_last_active_admin(client):
    token = _admin_token(client)
    admin = db.session.query(User).filter(User.email == "admin@example.com").one()

    response = client.delete(f"/users/{admin.id}", headers=auth_header(token))

    assert response.status_code == 400
    assert response.get_json()["error"]["message"] == "Cannot deactivate the last active admin."
    assert db.session.get(User, admin.id).is_active is True


def test_admin_can_deactivate_one_admin_when_another_active_admin_exists(client):
    token = _admin_token(client)
    second_admin = create_user("second-admin@example.com", ADMIN_ROLE)

    response = client.delete(f"/users/{second_admin.id}", headers=auth_header(token))

    assert response.status_code == 200
    assert db.session.get(User, second_admin.id).is_active is False
