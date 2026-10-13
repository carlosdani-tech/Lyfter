import pytest
from werkzeug.security import check_password_hash

from app.extensions import db
from app.models import Role, User
from app.services.auth_service import ADMIN_ROLE, CLIENT_ROLE
from app.utils.seed import SeedConflictError, seed_development_users
from tests.conftest import TestConfig, create_user


def _login(client, email: str, password: str) -> dict:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.get_json()["data"]


def test_seed_creates_active_admin_and_client_with_login_and_permissions(app, client):
    with app.app_context():
        seed_development_users()

        admin = db.session.query(User).filter_by(email="admin@example.com").one()
        seeded_client = (
            db.session.query(User).filter_by(email="client@example.com").one()
        )

        assert admin.role.name == ADMIN_ROLE
        assert seeded_client.role.name == CLIENT_ROLE
        assert admin.is_active is True
        assert seeded_client.is_active is True
        assert admin.password_hash != TestConfig.ADMIN_SEED_PASSWORD
        assert seeded_client.password_hash != TestConfig.CLIENT_SEED_PASSWORD
        assert check_password_hash(
            admin.password_hash,
            TestConfig.ADMIN_SEED_PASSWORD,
        )
        assert check_password_hash(
            seeded_client.password_hash,
            TestConfig.CLIENT_SEED_PASSWORD,
        )

        admin_session = _login(
            client,
            "admin@example.com",
            TestConfig.ADMIN_SEED_PASSWORD,
        )
        client_session = _login(
            client,
            "client@example.com",
            TestConfig.CLIENT_SEED_PASSWORD,
        )

        assert admin_session["user"]["role"] == ADMIN_ROLE
        assert client_session["user"]["role"] == CLIENT_ROLE

        product_payload = {
            "name": "Seed permission check",
            "price": "1.00",
            "stock": 1,
        }
        client_response = client.post(
            "/products",
            json=product_payload,
            headers={"Authorization": f"Bearer {client_session['access_token']}"},
        )
        admin_response = client.post(
            "/products",
            json=product_payload,
            headers={"Authorization": f"Bearer {admin_session['access_token']}"},
        )

        assert client_response.status_code == 403
        assert admin_response.status_code == 201


def test_seed_is_idempotent_and_does_not_reset_passwords(app):
    with app.app_context():
        seed_development_users()
        users = db.session.query(User).order_by(User.email).all()
        original_hashes = {user.email: user.password_hash for user in users}

        seed_development_users()

        assert db.session.query(User).count() == 2
        assert db.session.query(Role).count() == 2
        assert {
            user.email: user.password_hash
            for user in db.session.query(User).order_by(User.email).all()
        } == original_hashes


def test_seed_does_not_overwrite_existing_matching_user(app):
    with app.app_context():
        existing_admin = create_user(
            "admin@example.com",
            ADMIN_ROLE,
            password="test-only-existing-password",
        )
        existing_admin.first_name = "Existing"
        existing_admin.last_name = "Administrator"
        db.session.commit()
        original_hash = existing_admin.password_hash
        original_role_id = existing_admin.role_id
        original_is_active = existing_admin.is_active

        seed_development_users()

        persisted_admin = db.session.get(User, existing_admin.id)
        assert persisted_admin.password_hash == original_hash
        assert persisted_admin.role_id == original_role_id
        assert persisted_admin.is_active == original_is_active
        assert persisted_admin.first_name == "Existing"
        assert persisted_admin.last_name == "Administrator"
        assert db.session.query(User).count() == 2


def test_seed_rejects_existing_user_with_conflicting_role(app):
    with app.app_context():
        conflicting_user = create_user("admin@example.com", CLIENT_ROLE)
        original_hash = conflicting_user.password_hash

        with pytest.raises(SeedConflictError, match="ADMIN_SEED_EMAIL"):
            seed_development_users()

        persisted_user = db.session.get(User, conflicting_user.id)
        assert persisted_user.role.name == CLIENT_ROLE
        assert persisted_user.password_hash == original_hash
        assert db.session.query(User).count() == 1
