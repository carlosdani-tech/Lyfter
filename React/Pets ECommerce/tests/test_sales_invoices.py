from decimal import Decimal

import pytest
from flask_jwt_extended import decode_token

from app.extensions import db
from app.models import Cart, Invoice, Product, Sale, SaleItem
from app.services.auth_service import ADMIN_ROLE, CLIENT_ROLE
from tests.conftest import auth_header, create_user, login_user


def checkout_payload(cart=None):
    if cart is None:
        cart = db.session.query(Cart).order_by(Cart.id.desc()).first()
    items = cart.items if cart and cart.items else []
    return {
        "items": (
            [{"product_id": item.product_id, "quantity": item.quantity} for item in items]
            or [{"product_id": 1, "quantity": 2}]
        ),
        "total_amount": format(
            sum((item.product.price * item.quantity for item in items), Decimal("0.00")), ".2f"
        ),
        "full_name": "Ana Ejemplo",
        "buyer_email": "ana@example.com",
        "shipping_address": "Calle 1",
    }


def _checkout(client, token, key="checkout-1", payload=None):
    if payload is None:
        owner = int(decode_token(token)["sub"])
        cart = db.session.query(Cart).filter_by(user_id=owner).order_by(Cart.id.desc()).first()
        payload = checkout_payload(cart)
        existing = db.session.query(Sale).filter_by(user_id=owner, idempotency_key=key).first()
        if existing:
            payload = {
                "full_name": existing.full_name,
                "buyer_email": existing.buyer_email,
                "shipping_address": existing.shipping_address,
                "items": [
                    {"product_id": item.product_id, "quantity": item.quantity}
                    for item in existing.items
                ],
                "total_amount": format(existing.total_amount, ".2f"),
            }
    return client.post(
        "/sales/checkout",
        json=payload,
        headers={**auth_header(token), "Idempotency-Key": key},
    )


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

    response = _checkout(client, token)

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

    response = _checkout(client, token)

    assert response.status_code == 400
    assert response.get_json()["error"]["message"] == "Active cart has no items."


def test_checkout_rejects_insufficient_stock_without_partial_changes(client):
    token = _client_token(client)
    product = _create_product(stock=2)
    _add_to_cart(client, token, product, quantity=2)
    product.stock = 1
    db.session.commit()

    response = _checkout(client, token)

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

    response = _checkout(client, token)

    assert response.status_code == 403


def test_client_can_view_own_invoice(client):
    token = _client_token(client)
    product = _create_product()
    _add_to_cart(client, token, product)
    checkout_response = _checkout(client, token)
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
    checkout_response = _checkout(client, owner_token)
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
    checkout_response = _checkout(client, client_token)
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
    checkout_response = _checkout(client, token)
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
    checkout_response = _checkout(client, token)
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
    checkout_response = _checkout(client, owner_token)
    sale_id = checkout_response.get_json()["data"]["sale"]["id"]

    response = client.post(f"/sales/{sale_id}/cancel", headers=auth_header(other_token))

    assert response.status_code == 403
    assert db.session.get(Product, product.id).stock == 3


def test_exact_snapshots_and_replay_survive_product_changes(client):
    token = _client_token(client)
    product = _create_product(price="0.10", name="Alimento")
    _add_to_cart(client, token, product, 3)
    payload = checkout_payload()
    payload["full_name"] = "  Ana Ejemplo  "
    response = _checkout(client, token, payload=payload)
    assert response.status_code == 201
    original = response.get_json()
    sale = original["data"]["sale"]
    assert sale["full_name"] == "Ana Ejemplo"
    assert sale["buyer_email"] == "ana@example.com"
    assert sale["shipping_address"] == checkout_payload()["shipping_address"]
    assert sale["subtotal_amount"] == sale["total_amount"] == "0.30"
    assert sale["tax_amount"] == "0.00"
    assert sale["completed_at"].endswith("+00:00")
    assert sale["items"] == [
        {
            "id": 1,
            "product_id": product.id,
            "product_name": "Alimento",
            "quantity": 3,
            "unit_price": "0.10",
            "line_total": "0.30",
        }
    ]
    product.name = "Nombre nuevo"
    product.price = "99.99"
    db.session.commit()
    replay = _checkout(client, token)
    assert replay.status_code == 201
    assert replay.get_json() == original
    confirmation = client.get(f"/sales/{sale['id']}/confirmation", headers=auth_header(token))
    assert confirmation.status_code == 200
    assert confirmation.get_json() == original
    assert db.session.query(Sale).count() == db.session.query(Invoice).count() == 1


@pytest.mark.parametrize(
    "field,value",
    [
        ("full_name", None),
        ("full_name", "  "),
        ("full_name", 12),
        ("full_name", "a" * 201),
        ("buyer_email", "not-an-email"),
        ("buyer_email", "a" * 245 + "@example.com"),
        ("buyer_email", " "),
        ("buyer_email", []),
        ("shipping_address", None),
        ("shipping_address", []),
    ],
)
def test_invalid_buyer_fields(client, field, value):
    token = _client_token(client)
    payload = checkout_payload()
    payload[field] = value
    response = _checkout(client, token, payload=payload)
    assert response.status_code == 400
    assert response.get_json()["error"]["message"] == "Invalid request payload."
    assert db.session.query(Sale).count() == 0


@pytest.mark.parametrize("field", ["full_name", "buyer_email", "shipping_address"])
def test_missing_buyer_fields(client, field):
    token = _client_token(client)
    payload = checkout_payload()
    del payload[field]
    assert _checkout(client, token, payload=payload).status_code == 400


@pytest.mark.parametrize(
    "value", [None, {}, {"line1": "Calle 1"}, [], 123, "", " ", "\n\r\n", "x" * 501]
)
def test_invalid_address_fields(client, value):
    token = _client_token(client)
    product = _create_product(price="12.50")
    _add_to_cart(client, token, product)
    payload = checkout_payload()
    payload["shipping_address"] = value
    response = _checkout(client, token, payload=payload)
    assert response.status_code == 400
    assert "shipping_address" in response.get_json()["error"]["details"]
    assert_checkout_unchanged(product)


@pytest.mark.parametrize(
    "field",
    [
        "total",
        "price",
        "stock",
        "user_id",
        "role",
        "invoice_number",
        "status",
        "items",
    ],
)
def test_rejects_spoofed_fields(client, field):
    token = _client_token(client)
    payload = checkout_payload()
    payload[field] = "spoofed"
    assert _checkout(client, token, payload=payload).status_code == 400
    payload = checkout_payload()
    payload["shipping_address"] = {field: "spoofed"}
    assert _checkout(client, token, payload=payload).status_code == 400


@pytest.mark.parametrize("body", [None, [], "text", 42])
def test_malformed_body(client, body):
    token = _client_token(client)
    response = client.post(
        "/sales/checkout", json=body, headers={**auth_header(token), "Idempotency-Key": "key"}
    )
    assert response.status_code == 400


@pytest.mark.parametrize("key", [None, "", " ", "x" * 129, "bad key"])
def test_invalid_key(client, key):
    token = _client_token(client)
    headers = auth_header(token)
    if key is not None:
        headers["Idempotency-Key"] = key
    response = client.post("/sales/checkout", json=checkout_payload(), headers=headers)
    assert response.status_code == 400


def test_idempotency_conflict_distinct_keys_and_owner_scope(client):
    token = _client_token(client)
    other = _client_token(client, "other@example.com")
    product = _create_product(stock=10)
    _add_to_cart(client, token, product, 1)
    first = _checkout(client, token).get_json()
    changed = checkout_payload()
    changed["full_name"] = "Otra Persona"
    assert _checkout(client, token, payload=changed).status_code == 409
    assert _checkout(client, token, key="different").status_code == 400
    _add_to_cart(client, token, product, 1)
    assert _checkout(client, token).get_json() == first  # Does not consume the new cart.
    assert _checkout(client, token, key="different").status_code == 201
    _add_to_cart(client, other, product, 1)
    assert _checkout(client, other).status_code == 201
    assert db.session.query(Sale).count() == 3
    assert db.session.get(Product, product.id).stock == 7
    sale_id = first["data"]["sale"]["id"]
    assert (
        client.get(
            f"/sales/{sale_id}/confirmation",
            headers=auth_header(other),
        ).status_code
        == 404
    )
    assert client.get(f"/sales/{sale_id}/confirmation").status_code == 401
    admin = _admin_token(client)
    assert (
        client.get(
            f"/sales/{sale_id}/confirmation",
            headers=auth_header(admin),
        ).status_code
        == 403
    )


def test_inactive_product_and_unauthenticated_checkout(client):
    assert client.post("/sales/checkout", json=checkout_payload()).status_code == 401
    token = _client_token(client)
    product = _create_product()
    _add_to_cart(client, token, product)
    product.is_active = False
    db.session.commit()
    assert _checkout(client, token).status_code == 404
    assert db.session.query(Sale).count() == 0


def test_invoice_failure_rolls_back_everything_and_key_can_retry(client, monkeypatch):
    from app.repositories.invoice_repository import InvoiceRepository

    token = _client_token(client)
    product = _create_product()
    _add_to_cart(client, token, product)
    original = InvoiceRepository.create

    def fail(**kwargs):
        original(**kwargs)
        raise RuntimeError("Private database diagnostics")

    monkeypatch.setattr(InvoiceRepository, "create", fail)
    response = _checkout(client, token)
    assert response.status_code == 503
    assert "Private" not in response.get_data(as_text=True)
    assert db.session.query(Sale).count() == 0
    assert db.session.query(SaleItem).count() == 0
    assert db.session.query(Invoice).count() == 0
    assert db.session.get(Product, product.id).stock == 5
    assert db.session.query(Cart).one().status == "active"
    assert db.session.query(Cart).one().items[0].quantity == 2
    monkeypatch.setattr(InvoiceRepository, "create", original)
    assert _checkout(client, token).status_code == 201


def test_cannot_restore_stock_twice(client):
    token = _client_token(client)
    product = _create_product()
    _add_to_cart(client, token, product)
    sale_id = _checkout(client, token).get_json()["data"]["sale"]["id"]
    assert client.post(f"/sales/{sale_id}/cancel", headers=auth_header(token)).status_code == 200
    assert client.post(f"/sales/{sale_id}/return", headers=auth_header(token)).status_code == 400
    assert db.session.get(Product, product.id).stock == 5


def test_decimal_rounding_policy():
    from decimal import Decimal

    from app.services.sale_service import _money

    assert _money(Decimal("1.005")) == "1.01"
    assert _money(Decimal("0.1") + Decimal("0.2")) == "0.30"


def test_checkout_revalidates_persisted_stock_despite_stale_identity_map(client):
    from sqlalchemy import update

    token = _client_token(client)
    product = _create_product(stock=2)
    _add_to_cart(client, token, product, 2)
    assert product.stock == 2
    # Simulate a stock change that the ORM identity map has not observed.
    with db.engine.begin() as connection:
        connection.execute(update(Product).where(Product.id == product.id).values(stock=1))
    assert product.stock == 2
    assert _checkout(client, token).status_code == 400
    assert db.session.query(Sale).count() == 0
    assert db.session.get(Product, product.id).stock == 1
    assert db.session.query(Cart).one().status == "active"


def test_postgresql_checkout_queries_lock_rows_in_product_order(client):
    from sqlalchemy import event
    from sqlalchemy.dialects import postgresql

    token = _client_token(client)
    product = _create_product()
    _add_to_cart(client, token, product)
    statements = []

    def record(state):
        statement = state.statement
        if state.is_select and statement._for_update_arg is not None:
            statements.append(str(statement.compile(dialect=postgresql.dialect())))

    session = db.session()
    event.listen(session, "do_orm_execute", record)
    try:
        assert _checkout(client, token).status_code == 201
    finally:
        event.remove(session, "do_orm_execute", record)
    for table in ("users", "carts", "cart_items", "products"):
        assert any(f"FROM {table}" in sql and "FOR UPDATE" in sql for sql in statements)
    assert any("ORDER BY products.id FOR UPDATE" in sql for sql in statements)


def test_two_clients_cannot_purchase_the_same_last_units(client):
    first = _client_token(client)
    second = _client_token(client, "second@example.com")
    product = _create_product(stock=2)
    _add_to_cart(client, first, product, 2)
    _add_to_cart(client, second, product, 2)
    assert _checkout(client, first).status_code == 201
    assert _checkout(client, second).status_code == 400
    assert db.session.get(Product, product.id).stock == 0
    assert db.session.query(Sale).count() == 1
    assert db.session.query(Invoice).count() == 1


def test_database_rejects_duplicate_active_cart_and_checkout_key(client):
    from sqlalchemy.exc import IntegrityError

    token = _client_token(client)
    product = _create_product()
    _add_to_cart(client, token, product)
    cart = db.session.query(Cart).one()
    db.session.add(Cart(user_id=cart.user_id, status="active"))
    with pytest.raises(IntegrityError):
        db.session.flush()
    db.session.rollback()
    data = _checkout(client, token).get_json()["data"]
    sale = db.session.get(Sale, data["sale"]["id"])
    db.session.add(
        Sale(
            user_id=sale.user_id,
            idempotency_key=sale.idempotency_key,
            request_fingerprint=sale.request_fingerprint,
            full_name=sale.full_name,
            buyer_email=sale.buyer_email,
            shipping_address=sale.shipping_address,
            completed_at=sale.completed_at,
        )
    )
    with pytest.raises(IntegrityError):
        db.session.flush()
    db.session.rollback()
    assert db.session.query(Sale).count() == 1


def assert_checkout_unchanged(product, stock=5, quantity=2):
    assert db.session.query(Sale).count() == 0
    assert db.session.query(SaleItem).count() == 0
    assert db.session.query(Invoice).count() == 0
    assert db.session.get(Product, product.id).stock == stock
    assert db.session.get(Product, product.id).price == Decimal("12.50")
    cart = db.session.query(Cart).one()
    assert cart.status == "active"
    assert [(item.product_id, item.quantity) for item in cart.items] == [(product.id, quantity)]


@pytest.mark.parametrize("case", ["missing", "extra", "quantity"])
def test_submitted_items_must_match_locked_cart_without_mutations(client, app, monkeypatch, case):
    token = _client_token(client)
    product = _create_product(price="12.50")
    _add_to_cart(client, token, product)
    other = _create_product(price="5.00")
    payload = checkout_payload()
    if case == "missing":
        payload["items"] = [{"product_id": other.id, "quantity": 1}]
    elif case == "extra":
        payload["items"].append({"product_id": other.id, "quantity": 1})
    else:
        payload["items"][0]["quantity"] = 1
    monkeypatch.setattr(
        app.extensions["email_service"],
        "deliver",
        lambda *args: pytest.fail("No email on conflict"),
    )
    response = _checkout(client, token, payload=payload)
    assert response.status_code == 409
    assert response.get_json() == {
        "error": {"message": "Checkout cart snapshot does not match the active cart."}
    }
    assert_checkout_unchanged(product)
    assert other.stock == 5


@pytest.mark.parametrize(
    "items",
    [
        None,
        [],
        {},
        [None],
        [{"product_id": 1}],
        [{"product_id": 1, "quantity": 2}, {"product_id": 1, "quantity": 2}],
        [{"product_id": 1, "quantity": 2, "unit_price": "0.01"}],
        [{"product_id": 1, "quantity": 2, "product": {"id": 1}}],
        [{"product_id": i + 1, "quantity": 1} for i in range(1001)],
    ],
)
def test_invalid_item_structure_never_mutates_checkout(client, items):
    token = _client_token(client)
    product = _create_product(price="12.50")
    _add_to_cart(client, token, product)
    payload = checkout_payload()
    payload["items"] = items
    response = _checkout(client, token, payload=payload)
    assert response.status_code == 400
    assert "items" in response.get_json()["error"]["details"]
    assert_checkout_unchanged(product)


@pytest.mark.parametrize("field", ["product_id", "quantity"])
@pytest.mark.parametrize(
    "value", [None, True, False, 0, -1, 1.5, "2", 2147483648, 9007199254740992]
)
def test_item_ids_and_quantities_are_strict_positive_integers(client, field, value):
    token = _client_token(client)
    product = _create_product(price="12.50")
    _add_to_cart(client, token, product)
    payload = checkout_payload()
    payload["items"][0][field] = value
    assert _checkout(client, token, payload=payload).status_code == 400
    assert_checkout_unchanged(product)


@pytest.mark.parametrize(
    "value,status",
    [
        ("24.99", 409),
        ("25.01", 409),
        ("0.00", 409),
        (None, 400),
        (25, 400),
        (25.0, 400),
        ("25", 400),
        ("25.0", 400),
        ("025.00", 400),
        ("25.000", 400),
        ("-1.00", 400),
        ("25.00 ", 400),
        ("25.00\n", 400),
        ("₡25.00", 400),
        ("2,500.00", 400),
        ("100000000.00", 400),
        ("NaN", 400),
        ("Infinity", 400),
        ("2.5e1", 400),
    ],
)
def test_submitted_total_cannot_override_calculation(client, app, monkeypatch, value, status):
    token = _client_token(client)
    product = _create_product(price="12.50")
    _add_to_cart(client, token, product)
    payload = checkout_payload()
    payload["total_amount"] = value
    monkeypatch.setattr(
        app.extensions["email_service"],
        "deliver",
        lambda *args: pytest.fail("No email on rejection"),
    )
    response = _checkout(client, token, payload=payload)
    assert response.status_code == status
    if status == 409:
        assert response.get_json() == {
            "error": {"message": "Checkout total does not match the current cart total."}
        }
    else:
        assert "total_amount" in response.get_json()["error"]["details"]
    assert_checkout_unchanged(product)


@pytest.mark.parametrize("field", ["items", "total_amount"])
def test_snapshot_fields_are_required(client, field):
    token = _client_token(client)
    product = _create_product(price="12.50")
    _add_to_cart(client, token, product)
    payload = checkout_payload()
    del payload[field]
    assert _checkout(client, token, payload=payload).status_code == 400
    assert_checkout_unchanged(product)


def test_missing_product_from_multi_item_snapshot_is_conflict(client):
    token = _client_token(client)
    first = _create_product(price="12.50")
    second = _create_product(price="5.00")
    _add_to_cart(client, token, first)
    _add_to_cart(client, token, second, 1)
    payload = checkout_payload()
    payload["items"].pop()
    assert _checkout(client, token, payload=payload).status_code == 409
    assert db.session.query(Sale).count() == db.session.query(Invoice).count() == 0
    assert first.stock == second.stock == 5
    assert db.session.query(Cart).one().status == "active"
    assert len(db.session.query(Cart).one().items) == 2


def test_stale_price_requires_review_then_new_attempt_can_succeed(client):
    token = _client_token(client)
    product = _create_product(price="12.50")
    _add_to_cart(client, token, product)
    payload = checkout_payload()
    product.price = Decimal("13.00")
    db.session.commit()
    assert _checkout(client, token, payload=payload).status_code == 409
    assert db.session.query(Sale).count() == db.session.query(Invoice).count() == 0
    assert product.stock == 5 and db.session.query(Cart).one().status == "active"
    payload["total_amount"] = "26.00"
    result = _checkout(client, token, key="reviewed-attempt", payload=payload)
    assert result.status_code == 201
    data = result.get_json()["data"]
    assert data["sale"]["total_amount"] == data["invoice"]["total_amount"] == "26.00"
    assert data["sale"]["items"][0]["unit_price"] == "13.00"


def test_semantic_item_order_and_normalized_buyer_replay_without_email(client, app, monkeypatch):
    token = _client_token(client)
    first = _create_product(price="12.50")
    second = _create_product(price="5.00")
    _add_to_cart(client, token, first)
    _add_to_cart(client, token, second, 1)
    delivered = []
    monkeypatch.setattr(
        app.extensions["email_service"], "deliver", lambda sale_id: delivered.append(sale_id)
    )
    payload = checkout_payload()
    original = _checkout(client, token, payload=payload)
    assert original.status_code == 201
    payload["items"].reverse()
    payload["full_name"] = "  Ana Ejemplo  "
    payload["shipping_address"] = "  Calle 1  "
    assert _checkout(client, token, payload=payload).get_json() == original.get_json()
    assert len(delivered) == 1
    assert db.session.query(Sale).count() == db.session.query(Invoice).count() == 1
    assert first.stock == 3 and second.stock == 4
    assert db.session.query(Cart).one().status == "checked_out"


@pytest.mark.parametrize("change", ["quantity", "total", "buyer", "address", "product"])
def test_key_fingerprint_covers_complete_request(client, change):
    token = _client_token(client)
    product = _create_product(price="12.50")
    _add_to_cart(client, token, product)
    payload = checkout_payload()
    assert _checkout(client, token, payload=payload).status_code == 201
    if change == "quantity":
        payload["items"][0]["quantity"] = 1
    elif change == "total":
        payload["total_amount"] = "24.99"
    elif change == "buyer":
        payload["buyer_email"] = "otra@example.com"
    elif change == "address":
        payload["shipping_address"] = "Calle 2"
    else:
        payload["items"][0]["product_id"] += 1
    response = _checkout(client, token, payload=payload)
    assert response.status_code == 409
    assert (
        response.get_json()["error"]["message"]
        == "Idempotency key was already used with different details."
    )
    assert db.session.query(Sale).count() == db.session.query(Invoice).count() == 1
    assert product.stock == 3


@pytest.mark.parametrize(
    "field",
    [
        "user_id",
        "price",
        "unit_price",
        "line_total",
        "subtotal",
        "tax",
        "invoice_number",
        "status",
        "email_status",
    ],
)
def test_forbidden_overrides_cannot_mutate_checkout(client, field):
    token = _client_token(client)
    product = _create_product(price="12.50")
    _add_to_cart(client, token, product)
    payload = checkout_payload()
    payload[field] = 1
    assert _checkout(client, token, payload=payload).status_code == 400
    assert_checkout_unchanged(product)


def test_submitted_other_owners_cart_cannot_be_purchased(client):
    owner = _client_token(client)
    other = _client_token(client, "other@example.com")
    first = _create_product(price="12.50")
    second = _create_product(price="12.50")
    _add_to_cart(client, owner, first)
    _add_to_cart(client, other, second)
    payload = checkout_payload()
    assert payload["items"][0]["product_id"] == second.id
    assert _checkout(client, owner, payload=payload).status_code == 409
    assert db.session.query(Sale).count() == db.session.query(Invoice).count() == 0
    assert first.stock == second.stock == 5
    assert all(cart.status == "active" for cart in db.session.query(Cart).all())
    assert sorted(
        item.product_id for cart in db.session.query(Cart).all() for item in cart.items
    ) == [first.id, second.id]


@pytest.mark.parametrize(
    "address",
    [
        "Calle 1",
        "Del parque central de San José, 200 metros al norte, edificio azul.",
        "Apartamento 3, portón café; preguntar por Ana.",
        "Edificio azul.\nApartamento 3.",
        "a" * 500,
    ],
)
def test_text_address_snapshot_confirmation_and_invoice(client, address):
    token = _client_token(client)
    product = _create_product(price="12.50")
    _add_to_cart(client, token, product)
    payload = checkout_payload()
    payload["shipping_address"] = "  " + address + "  "
    response = _checkout(client, token, payload=payload)
    assert response.status_code == 201
    data = response.get_json()["data"]
    sale = db.session.query(Sale).one()
    assert sale.shipping_address == address
    assert (
        data["sale"]["shipping_address"] == data["invoice"]["sale"]["shipping_address"] == address
    )
    assert data["sale"]["total_amount"] == data["invoice"]["total_amount"] == "25.00"
    assert db.session.query(Sale).count() == db.session.query(Invoice).count() == 1
    assert product.stock == 3
    assert db.session.query(Cart).one().status == "checked_out"
    confirmation = client.get(f"/sales/{sale.id}/confirmation", headers=auth_header(token))
    assert confirmation.get_json() == response.get_json()
    assert _checkout(client, token, payload=payload).get_json() == response.get_json()
    payload["shipping_address"] = address + " Otra puerta."
    if len(payload["shipping_address"]) <= 500:
        assert _checkout(client, token, payload=payload).status_code == 409
    assert product.stock == 3


def test_address_line_endings_have_one_fingerprint_and_preserve_internal_spaces(client):
    token = _client_token(client)
    product = _create_product(price="12.50")
    _add_to_cart(client, token, product)
    payload = checkout_payload()
    payload["shipping_address"] = "  Edificio azul.\r\nApartamento  3.\rSan José.  "
    response = _checkout(client, token, payload=payload)
    assert response.status_code == 201
    expected = "Edificio azul.\nApartamento  3.\nSan José."
    assert db.session.query(Sale).one().shipping_address == expected
    payload["shipping_address"] = expected
    assert _checkout(client, token, payload=payload).get_json() == response.get_json()
    assert db.session.query(Sale).count() == db.session.query(Invoice).count() == 1
    assert product.stock == 3


def test_legacy_address_snapshots_remain_readable_without_rewriting(client):
    token = _client_token(client)
    product = _create_product(price="12.50")
    _add_to_cart(client, token, product)
    _checkout(client, token)
    sale = db.session.query(Sale).one()
    legacy = {
        "line1": "Calle 1",
        "line2": None,
        "city": "San José",
        "province": "San José",
        "postal_code": "10101",
        "country": "CR",
    }
    sale.shipping_address = legacy
    db.session.commit()
    response = client.get(f"/sales/{sale.id}/confirmation", headers=auth_header(token))
    assert response.status_code == 200
    assert response.get_json()["data"]["sale"]["shipping_address"] == legacy
    assert response.get_json()["data"]["invoice"]["sale"]["shipping_address"] == legacy
    assert sale.shipping_address == legacy
