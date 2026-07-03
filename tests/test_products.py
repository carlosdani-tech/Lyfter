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
            "price": "7.50",
            "stock": 25,
            "image_url": "https://example.com/cat-toy.jpg",
        },
        headers=auth_header(token),
    )

    assert response.status_code == 201
    product_data = response.get_json()["data"]["product"]
    assert product_data["name"] == "Cat Toy"
    assert product_data["price"] == "7.50"
    assert product_data["stock"] == 25
    assert product_data["is_active"] is True

    product = db.session.get(Product, product_data["id"])
    assert product is not None
    assert product.image_url == "https://example.com/cat-toy.jpg"


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


def test_client_can_list_active_products(client):
    token = _client_token(client)
    _create_product(name="Active Product")
    _create_product(name="Inactive Product", is_active=False)

    response = client.get("/products", headers=auth_header(token))

    assert response.status_code == 200
    products = response.get_json()["data"]["products"]
    assert [product["name"] for product in products] == ["Active Product"]


def test_client_can_get_product_detail(client):
    token = _client_token(client)
    product = _create_product()

    response = client.get(f"/products/{product.id}", headers=auth_header(token))

    assert response.status_code == 200
    product_data = response.get_json()["data"]["product"]
    assert product_data["id"] == product.id
    assert product_data["name"] == "Dog Food"
    assert product_data["price"] == "19.99"
    assert product_data["stock"] == 10


def test_product_detail_returns_404_for_inactive_product(client):
    token = _client_token(client)
    product = _create_product(is_active=False)

    response = client.get(f"/products/{product.id}", headers=auth_header(token))

    assert response.status_code == 404


def test_admin_can_update_product(client):
    token = _admin_token(client)
    product = _create_product()

    response = client.put(
        f"/products/{product.id}",
        json={"price": "24.00", "stock": 8, "image_url": None},
        headers=auth_header(token),
    )

    assert response.status_code == 200
    product_data = response.get_json()["data"]["product"]
    assert product_data["price"] == "24.00"
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


def test_admin_can_deactivate_product(client):
    token = _admin_token(client)
    product = _create_product()

    response = client.delete(f"/products/{product.id}", headers=auth_header(token))

    assert response.status_code == 200
    product_data = response.get_json()["data"]["product"]
    assert product_data["is_active"] is False
    assert db.session.get(Product, product.id).is_active is False
