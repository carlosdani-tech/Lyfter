from app.extensions import db
from app.models import Cart, CartItem, Product
from app.services.auth_service import ADMIN_ROLE, CLIENT_ROLE
from tests.conftest import auth_header, create_user, login_user


def _client_token(client, email: str = "client@example.com") -> str:
    create_user(email, CLIENT_ROLE)
    return login_user(client, email)


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


def test_client_can_create_or_get_active_cart(client):
    token = _client_token(client)

    first_response = client.get("/cart", headers=auth_header(token))
    second_response = client.get("/cart", headers=auth_header(token))

    assert first_response.status_code == 200
    assert second_response.status_code == 200

    first_cart = first_response.get_json()["data"]["cart"]
    second_cart = second_response.get_json()["data"]["cart"]
    assert first_cart["id"] == second_cart["id"]
    assert first_cart["items"] == []
    assert first_cart["subtotal"] == "0.00"
    assert first_cart["total"] == "0.00"


def test_client_can_add_product_to_cart_without_changing_stock(client):
    token = _client_token(client)
    product = _create_product(price="12.50", stock=5)

    response = client.post(
        "/cart/items",
        json={"product_id": product.id, "quantity": 2},
        headers=auth_header(token),
    )

    assert response.status_code == 201
    cart = response.get_json()["data"]["cart"]
    assert cart["subtotal"] == "25.00"
    assert cart["total"] == "25.00"
    assert cart["items"] == [
        {
            "id": cart["items"][0]["id"],
            "product_id": product.id,
            "name": "Dog Food",
            "unit_price": "12.50",
            "quantity": 2,
            "line_total": "25.00",
        }
    ]
    assert db.session.get(Product, product.id).stock == 5


def test_adding_existing_product_increments_quantity(client):
    token = _client_token(client)
    product = _create_product(price="3.00", stock=5)

    client.post(
        "/cart/items",
        json={"product_id": product.id, "quantity": 2},
        headers=auth_header(token),
    )
    response = client.post(
        "/cart/items",
        json={"product_id": product.id, "quantity": 3},
        headers=auth_header(token),
    )

    assert response.status_code == 201
    cart = response.get_json()["data"]["cart"]
    assert len(cart["items"]) == 1
    assert cart["items"][0]["quantity"] == 5
    assert cart["subtotal"] == "15.00"


def test_add_product_rejects_invalid_quantity(client):
    token = _client_token(client)
    product = _create_product()

    response = client.post(
        "/cart/items",
        json={"product_id": product.id, "quantity": 0},
        headers=auth_header(token),
    )

    assert response.status_code == 400
    assert "quantity" in response.get_json()["error"]["details"]


def test_add_product_rejects_quantity_greater_than_stock(client):
    token = _client_token(client)
    product = _create_product(stock=2)

    response = client.post(
        "/cart/items",
        json={"product_id": product.id, "quantity": 3},
        headers=auth_header(token),
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["message"] == (
        "Quantity cannot be greater than available stock."
    )
    assert db.session.get(Product, product.id).stock == 2


def test_add_product_returns_404_when_product_not_found(client):
    token = _client_token(client)

    response = client.post(
        "/cart/items",
        json={"product_id": 999, "quantity": 1},
        headers=auth_header(token),
    )

    assert response.status_code == 404


def test_client_can_update_cart_item_quantity(client):
    token = _client_token(client)
    product = _create_product(price="4.25", stock=10)
    add_response = client.post(
        "/cart/items",
        json={"product_id": product.id, "quantity": 2},
        headers=auth_header(token),
    )
    item_id = add_response.get_json()["data"]["cart"]["items"][0]["id"]

    response = client.put(
        f"/cart/items/{item_id}",
        json={"quantity": 4},
        headers=auth_header(token),
    )

    assert response.status_code == 200
    cart = response.get_json()["data"]["cart"]
    assert cart["items"][0]["quantity"] == 4
    assert cart["subtotal"] == "17.00"
    assert db.session.get(Product, product.id).stock == 10


def test_update_cart_item_rejects_quantity_greater_than_stock(client):
    token = _client_token(client)
    product = _create_product(stock=3)
    add_response = client.post(
        "/cart/items",
        json={"product_id": product.id, "quantity": 2},
        headers=auth_header(token),
    )
    item_id = add_response.get_json()["data"]["cart"]["items"][0]["id"]

    response = client.put(
        f"/cart/items/{item_id}",
        json={"quantity": 4},
        headers=auth_header(token),
    )

    assert response.status_code == 400
    assert db.session.get(Product, product.id).stock == 3


def test_client_can_remove_cart_item(client):
    token = _client_token(client)
    product = _create_product()
    add_response = client.post(
        "/cart/items",
        json={"product_id": product.id, "quantity": 2},
        headers=auth_header(token),
    )
    item_id = add_response.get_json()["data"]["cart"]["items"][0]["id"]

    response = client.delete(f"/cart/items/{item_id}", headers=auth_header(token))

    assert response.status_code == 200
    cart = response.get_json()["data"]["cart"]
    assert cart["items"] == []
    assert cart["subtotal"] == "0.00"
    assert db.session.get(CartItem, item_id) is None


def test_client_cannot_access_another_clients_cart_item(client):
    owner_token = _client_token(client, "owner@example.com")
    other_token = _client_token(client, "other@example.com")
    product = _create_product()
    add_response = client.post(
        "/cart/items",
        json={"product_id": product.id, "quantity": 1},
        headers=auth_header(owner_token),
    )
    item_id = add_response.get_json()["data"]["cart"]["items"][0]["id"]

    update_response = client.put(
        f"/cart/items/{item_id}",
        json={"quantity": 2},
        headers=auth_header(other_token),
    )
    delete_response = client.delete(
        f"/cart/items/{item_id}",
        headers=auth_header(other_token),
    )

    assert update_response.status_code == 403
    assert delete_response.status_code == 403
    assert db.session.get(CartItem, item_id) is not None


def test_each_client_gets_own_active_cart(client):
    first_token = _client_token(client, "first@example.com")
    second_token = _client_token(client, "second@example.com")

    first_response = client.get("/cart", headers=auth_header(first_token))
    second_response = client.get("/cart", headers=auth_header(second_token))

    first_cart = first_response.get_json()["data"]["cart"]
    second_cart = second_response.get_json()["data"]["cart"]
    assert first_cart["id"] != second_cart["id"]
    assert db.session.query(Cart).count() == 2

def test_admin_cannot_access_client_cart(client):
    create_user("admin@example.com", ADMIN_ROLE)
    token = login_user(client, "admin@example.com")

    response = client.get("/cart", headers=auth_header(token))

    assert response.status_code == 403

