import app.extensions as extensions
from app.extensions import db
from app.models import Product
from app.services.auth_service import ADMIN_ROLE, CLIENT_ROLE
from tests.conftest import auth_header, create_user, login_user


def _admin_token(client) -> str:
    create_user("admin@example.com", ADMIN_ROLE)
    return login_user(client, "admin@example.com")


def _client_token(client) -> str:
    create_user("client@example.com", CLIENT_ROLE)
    return login_user(client, "client@example.com")


def _create_product(**overrides) -> Product:
    data = {
        "name": "Dog Food",
        "description": "Dry food for adult dogs",
        "category": "Food",
        "price": "19.99",
        "stock": 10,
        "image_url": "https://example.com/dog-food.jpg",
    }
    data.update(overrides)
    product = Product(**data)
    db.session.add(product)
    db.session.commit()
    return product


def test_admin_can_create_product(client):
    token = _admin_token(client)

    response = client.post(
        "/products",
        json={
            "name": "Cat Toy",
            "description": "Interactive toy",
            "category": "Toys",
            "price": "7.50",
            "stock": 25,
            "image_url": "https://example.com/cat-toy.jpg",
        },
        headers=auth_header(token),
    )

    assert response.status_code == 201
    product_data = response.get_json()["data"]["product"]
    assert product_data["name"] == "Cat Toy"
    assert product_data["category"] == "Toys"
    assert product_data["price"] == "7.50"
    assert product_data["stock"] == 25
    assert product_data["is_active"] is True

    product = db.session.get(Product, product_data["id"])
    assert product is not None
    assert product.image_url == "https://example.com/cat-toy.jpg"
    assert product.category == "Toys"


def test_client_cannot_create_product(client):
    token = _client_token(client)

    response = client.post(
        "/products",
        json={"name": "Cat Toy", "price": "7.50", "stock": 25},
        headers=auth_header(token),
    )

    assert response.status_code == 403


def test_create_product_validates_payload(client):
    token = _admin_token(client)

    response = client.post(
        "/products",
        json={"name": "", "price": "-1", "stock": -2},
        headers=auth_header(token),
    )

    assert response.status_code == 400
    details = response.get_json()["error"]["details"]
    assert "name" in details
    assert "price" in details
    assert "stock" in details


def test_create_product_rejects_overlong_category(client):
    token = _admin_token(client)

    response = client.post(
        "/products",
        json={
            "name": "Cat Toy",
            "category": "x" * 101,
            "price": "7.50",
            "stock": 25,
        },
        headers=auth_header(token),
    )

    assert response.status_code == 400
    assert "category" in response.get_json()["error"]["details"]


def test_public_user_can_list_active_products(client):
    _create_product(name="Active Product")
    _create_product(name="Inactive Product", is_active=False)

    response = client.get("/products")

    assert response.status_code == 200
    products = response.get_json()["data"]["products"]
    assert [product["name"] for product in products] == ["Active Product"]
    assert products[0]["category"] == "Food"


def test_public_user_can_list_products_with_redis_disabled(client, monkeypatch):
    monkeypatch.setattr(extensions, "redis_client", None)
    _create_product(name="PostgreSQL Product")

    response = client.get("/products")

    assert response.status_code == 200
    assert response.get_json()["data"]["products"][0]["name"] == "PostgreSQL Product"


def test_public_user_can_get_product_detail(client):
    product = _create_product()

    response = client.get(f"/products/{product.id}")

    assert response.status_code == 200
    product_data = response.get_json()["data"]["product"]
    assert product_data["id"] == product.id
    assert product_data["name"] == "Dog Food"
    assert product_data["category"] == "Food"
    assert product_data["price"] == "19.99"
    assert product_data["stock"] == 10


def test_public_user_can_get_product_detail_with_redis_disabled(client, monkeypatch):
    monkeypatch.setattr(extensions, "redis_client", None)
    product = _create_product(name="Direct Detail")

    response = client.get(f"/products/{product.id}")

    assert response.status_code == 200
    assert response.get_json()["data"]["product"]["name"] == "Direct Detail"


def test_product_detail_returns_404_for_inactive_product(client):
    product = _create_product(is_active=False)

    response = client.get(f"/products/{product.id}")

    assert response.status_code == 404


def test_admin_can_update_product(client):
    token = _admin_token(client)
    product = _create_product()

    response = client.put(
        f"/products/{product.id}",
        json={
            "category": "Nutrition",
            "price": "24.00",
            "stock": 8,
            "image_url": None,
        },
        headers=auth_header(token),
    )

    assert response.status_code == 200
    product_data = response.get_json()["data"]["product"]
    assert product_data["price"] == "24.00"
    assert product_data["category"] == "Nutrition"
    assert product_data["stock"] == 8
    assert product_data["image_url"] is None


def test_client_cannot_update_product(client):
    token = _client_token(client)
    product = _create_product()

    response = client.put(
        f"/products/{product.id}",
        json={"stock": 8},
        headers=auth_header(token),
    )

    assert response.status_code == 403


def test_client_cannot_deactivate_product(client):
    token = _client_token(client)
    product = _create_product()

    response = client.delete(
        f"/products/{product.id}",
        headers=auth_header(token),
    )

    assert response.status_code == 403
    assert db.session.get(Product, product.id).is_active is True


def test_missing_token_cannot_deactivate_product(client):
    product = _create_product()

    response = client.delete(f"/products/{product.id}")

    assert response.status_code == 401
    assert db.session.get(Product, product.id).is_active is True


def test_admin_can_deactivate_product(client):
    token = _admin_token(client)
    product = _create_product()

    list_response = client.get("/products")
    assert list_response.status_code == 200
    listed_product_ids = [
        item["id"] for item in list_response.get_json()["data"]["products"]
    ]
    assert listed_product_ids == [product.id]

    cached_detail_response = client.get(f"/products/{product.id}")
    assert cached_detail_response.status_code == 200

    response = client.delete(f"/products/{product.id}", headers=auth_header(token))

    assert response.status_code == 200
    product_data = response.get_json()["data"]["product"]
    assert product_data["is_active"] is False
    assert db.session.get(Product, product.id).is_active is False

    refreshed_list_response = client.get("/products")
    assert refreshed_list_response.status_code == 200
    assert refreshed_list_response.get_json()["data"]["products"] == []

    detail_response = client.get(f"/products/{product.id}")
    assert detail_response.status_code == 404
