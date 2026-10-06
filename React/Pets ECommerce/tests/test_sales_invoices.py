from app.extensions import db
from app.models import Cart, Invoice, Product, Sale, SaleItem
from app.services.auth_service import ADMIN_ROLE, CLIENT_ROLE
from tests.conftest import auth_header, create_user, login_user


def _token(client, email: str, role: str) -> str:
    create_user(email, role)
    return login_user(client, email)


def _client_token(client, email: str = "client@example.com") -> str:
    return _token(client, email, CLIENT_ROLE)


def _admin_token(client, email: str = "admin@example.com") -> str:
    return _token(client, email, ADMIN_ROLE)


def _create_product(**overrides) -> Product:
    data = {
        "name": "Dog Food",
        "description": "Dry food for adult dogs",
        "price": "10.00",
        "stock": 5,
        "image_url": "https://example.com/dog-food.jpg",
    }
    data.update(overrides)
    product = Product(**data)
    db.session.add(product)
    db.session.commit()
    return product


def _add_to_cart(client, token: str, product: Product, quantity: int = 2):
    response = client.post(
        "/cart/items",
        json={"product_id": product.id, "quantity": quantity},
        headers=auth_header(token),
    )
    assert response.status_code == 201
    return response


def test_checkout_creates_sale_invoice_items_and_reduces_stock(client):
    token = _client_token(client)
    product = _create_product(price="12.50", stock=5)
    _add_to_cart(client, token, product, quantity=2)

    response = client.post("/sales/checkout", headers=auth_header(token))

    assert response.status_code == 201
    data = response.get_json()["data"]
    sale_data = data["sale"]
    invoice_data = data["invoice"]

    assert sale_data["status"] == "completed"
    assert sale_data["subtotal_amount"] == "25.00"
    assert sale_data["total_amount"] == "25.00"
    assert sale_data["items"][0]["product_id"] == product.id
    assert sale_data["items"][0]["quantity"] == 2
    assert invoice_data["invoice_number"] == f"INV-{sale_data['id']:06d}"
    assert invoice_data["status"] == "issued"
    assert invoice_data["total_amount"] == "25.00"

    assert db.session.get(Product, product.id).stock == 3
    assert db.session.query(Sale).count() == 1
    assert db.session.query(SaleItem).count() == 1
    assert db.session.query(Invoice).count() == 1
    assert db.session.query(Cart).one().status == "checked_out"


def test_checkout_rejects_empty_cart(client):
    token = _client_token(client)
    client.get("/cart", headers=auth_header(token))

    response = client.post("/sales/checkout", headers=auth_header(token))

    assert response.status_code == 400
    assert response.get_json()["error"]["message"] == "Active cart has no items."


def test_checkout_rejects_insufficient_stock_without_partial_changes(client):
    token = _client_token(client)
    product = _create_product(stock=2)
    _add_to_cart(client, token, product, quantity=2)
    product.stock = 1
    db.session.commit()

    response = client.post("/sales/checkout", headers=auth_header(token))

    assert response.status_code == 400
    assert response.get_json()["error"]["message"] == (
        "Insufficient stock for one or more products."
    )
    assert db.session.get(Product, product.id).stock == 1
    assert db.session.query(Sale).count() == 0
    assert db.session.query(Invoice).count() == 0
    assert db.session.query(Cart).one().status == "active"


def test_admin_cannot_checkout_client_cart(client):
    token = _admin_token(client)

    response = client.post("/sales/checkout", headers=auth_header(token))

    assert response.status_code == 403


def test_client_can_view_own_invoice(client):
    token = _client_token(client)
    product = _create_product()
    _add_to_cart(client, token, product)
    checkout_response = client.post("/sales/checkout", headers=auth_header(token))
    invoice_id = checkout_response.get_json()["data"]["invoice"]["id"]

    list_response = client.get("/invoices", headers=auth_header(token))
    detail_response = client.get(f"/invoices/{invoice_id}", headers=auth_header(token))

    assert list_response.status_code == 200
    assert detail_response.status_code == 200
    invoices = list_response.get_json()["data"]["invoices"]
    assert [invoice["id"] for invoice in invoices] == [invoice_id]
    assert detail_response.get_json()["data"]["invoice"]["id"] == invoice_id


def test_client_cannot_view_another_clients_invoice(client):
    owner_token = _client_token(client, "owner@example.com")
    other_token = _client_token(client, "other@example.com")
    product = _create_product()
    _add_to_cart(client, owner_token, product)
    checkout_response = client.post("/sales/checkout", headers=auth_header(owner_token))
    invoice_id = checkout_response.get_json()["data"]["invoice"]["id"]

    list_response = client.get("/invoices", headers=auth_header(other_token))
    detail_response = client.get(f"/invoices/{invoice_id}", headers=auth_header(other_token))

    assert list_response.status_code == 200
    assert list_response.get_json()["data"]["invoices"] == []
    assert detail_response.status_code == 403


def test_admin_can_view_all_invoices(client):
    client_token = _client_token(client)
    admin_token = _admin_token(client)
    product = _create_product()
    _add_to_cart(client, client_token, product)
    checkout_response = client.post("/sales/checkout", headers=auth_header(client_token))
    invoice_id = checkout_response.get_json()["data"]["invoice"]["id"]

    list_response = client.get("/invoices", headers=auth_header(admin_token))
    detail_response = client.get(f"/invoices/{invoice_id}", headers=auth_header(admin_token))

    assert list_response.status_code == 200
    assert [invoice["id"] for invoice in list_response.get_json()["data"]["invoices"]] == [
        invoice_id
    ]
    assert detail_response.status_code == 200


def test_cancelling_sale_restores_stock_and_updates_invoice(client):
    token = _client_token(client)
    product = _create_product(stock=5)
    _add_to_cart(client, token, product, quantity=2)
    checkout_response = client.post("/sales/checkout", headers=auth_header(token))
    sale_id = checkout_response.get_json()["data"]["sale"]["id"]

    response = client.post(f"/sales/{sale_id}/cancel", headers=auth_header(token))

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["sale"]["status"] == "cancelled"
    assert data["invoice"]["status"] == "cancelled"
    assert db.session.get(Product, product.id).stock == 5


def test_returning_sale_restores_stock_and_refunds_invoice(client):
    token = _client_token(client)
    product = _create_product(stock=5)
    _add_to_cart(client, token, product, quantity=2)
    checkout_response = client.post("/sales/checkout", headers=auth_header(token))
    sale_id = checkout_response.get_json()["data"]["sale"]["id"]

    response = client.post(f"/sales/{sale_id}/return", headers=auth_header(token))

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["sale"]["status"] == "returned"
    assert data["invoice"]["status"] == "refunded"
    assert db.session.get(Product, product.id).stock == 5


def test_client_cannot_cancel_another_clients_sale(client):
    owner_token = _client_token(client, "owner@example.com")
    other_token = _client_token(client, "other@example.com")
    product = _create_product(stock=5)
    _add_to_cart(client, owner_token, product, quantity=2)
    checkout_response = client.post("/sales/checkout", headers=auth_header(owner_token))
    sale_id = checkout_response.get_json()["data"]["sale"]["id"]

    response = client.post(f"/sales/{sale_id}/cancel", headers=auth_header(other_token))

    assert response.status_code == 403
    assert db.session.get(Product, product.id).stock == 3
