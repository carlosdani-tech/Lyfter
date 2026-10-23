import smtplib
from datetime import timedelta
from unittest.mock import Mock

import pytest
from sqlalchemy.exc import OperationalError

from app import create_app
from app.extensions import db
from app.models import Cart, Invoice, Product, Sale
from app.models.mixins import utc_now
from app.repositories.email_repository import EmailRepository
from app.services.email_service import EmailService
from app.services.email_transport import EmailTransportError
from tests.conftest import TestConfig, auth_header
from tests.test_sales_invoices import (
    _add_to_cart,
    _admin_token,
    _checkout,
    _client_token,
    _create_product,
    checkout_payload,
)


class RecordingTransport:
    def __init__(self, error=None):
        self.messages = []
        self.error = error

    def send(self, message):
        # Independent SQL connection proves the purchase and claim committed before SMTP.
        with db.engine.connect() as connection:
            sale = connection.execute(db.select(Sale.id, Sale.email_in_flight)).one()
            assert sale.email_in_flight is True
            assert connection.execute(db.select(Invoice.id)).one()
        self.messages.append(message)
        if self.error:
            raise self.error


def configure_email(app):
    app.config.update(
        EMAIL_ENABLED=True,
        SMTP_HOST="smtp.example.com",
        SMTP_PORT=587,
        SMTP_SECURITY="starttls",
        SMTP_USERNAME="",
        SMTP_PASSWORD="",
        SMTP_SENDER="confirmaciones@example.com",
        SMTP_TIMEOUT_SECONDS=5,
    )


def inject(app, transport):
    configure_email(app)
    app.extensions["email_service"] = EmailService(transport)


def prepare(client):
    token = _client_token(client)
    product = _create_product(name="Alimento", price="12.50", stock=5)
    _add_to_cart(client, token, product, 2)
    return token, product


def retry(client, token, sale_id):
    return client.post(f"/sales/{sale_id}/email/retry", headers=auth_header(token))


def allow_retry(sale):
    sale.email_last_attempt_at = utc_now() - timedelta(seconds=61)
    db.session.commit()


def test_successful_delivery_contents_and_no_resend_after_sent(client, app):
    transport = RecordingTransport()
    inject(app, transport)
    token, product = prepare(client)
    response = _checkout(client, token)
    assert response.status_code == 201
    data = response.get_json()["data"]
    sale = db.session.query(Sale).one()
    assert data["sale"]["email_status"] == sale.email_status == "sent"
    assert sale.email_attempts == 1
    assert sale.email_sent_at is not None and sale.email_last_attempt_at is not None
    assert sale.email_error_code is None and not sale.email_in_flight
    assert len(transport.messages) == 1
    message = transport.messages[0]
    assert str(message["From"]) == "confirmaciones@example.com"
    assert str(message["To"]) == "ana@example.com"
    assert str(message["Subject"]) == "Confirmación de tu compra en PawStore - INV-000001"
    assert str(message["Message-ID"]) == "<pawstore-sale-1@example.com>"
    assert message.get_content_type() == "text/plain"
    assert message.get_content() == (
        "Hola, Ana Ejemplo:\n\nGracias por tu compra en PawStore.\n"
        "Pedido: 1\nFactura: INV-000001\n\nProductos:\n"
        "Alimento | Cantidad: 2 | Precio unitario: 12.50 | Subtotal: 25.00\n\n"
        "Subtotal: 25.00\nImpuestos: 0.00\nTotal: 25.00\n\nDirección de envío:\n"
        "Calle 1\n\n"
        "Conserva esta confirmación como referencia de tu compra.\n"
    )
    assert _checkout(client, token).get_json() == response.get_json()
    assert retry(client, token, sale.id).get_json() == response.get_json()
    assert len(transport.messages) == 1
    assert db.session.query(Sale).count() == db.session.query(Invoice).count() == 1
    assert db.session.get(Product, product.id).stock == 3


def test_disabled_delivery_is_pending_and_can_be_enabled_later(client, app):
    transport = RecordingTransport()
    inject(app, transport)
    app.config["EMAIL_ENABLED"] = False
    token, _ = prepare(client)
    response = _checkout(client, token)
    assert response.status_code == 201
    sale = db.session.query(Sale).one()
    assert response.get_json()["data"]["sale"]["email_status"] == "pending"
    assert sale.email_attempts == 0 and sale.email_error_code == "disabled"
    assert not transport.messages
    app.config["EMAIL_ENABLED"] = True
    assert _checkout(client, token).get_json() == response.get_json()
    assert not transport.messages
    assert retry(client, token, sale.id).get_json()["data"]["sale"]["email_status"] == "sent"
    assert len(transport.messages) == 1


@pytest.mark.parametrize(
    "field,value",
    [
        ("SMTP_HOST", ""),
        ("SMTP_PORT", 0),
        ("SMTP_SECURITY", "none"),
        ("SMTP_TIMEOUT_SECONDS", 0),
        ("SMTP_TIMEOUT_SECONDS", float("inf")),
        ("SMTP_TIMEOUT_SECONDS", float("nan")),
        ("SMTP_TIMEOUT_SECONDS", 61),
        ("SMTP_USERNAME", "configured-user"),
        ("SMTP_SENDER", ""),
        ("SMTP_SENDER", "sender@example.com\r\nBcc: hidden@example.com"),
    ],
)
def test_missing_or_unsafe_config_never_connects_and_preserves_purchase(client, app, field, value):
    configure_email(app)
    app.config[field] = value
    token, product = prepare(client)
    response = _checkout(client, token)
    assert response.status_code == 201
    sale = db.session.query(Sale).one()
    assert response.get_json()["data"]["sale"]["email_status"] == "failed"
    assert sale.email_error_code in {"configuration", "invalid_address"}
    assert db.session.query(Sale).count() == db.session.query(Invoice).count() == 1
    assert db.session.get(Product, product.id).stock == 3
    assert db.session.query(Cart).one().status == "checked_out"


def test_failed_delivery_replay_and_explicit_retry_are_bounded(client, app, caplog):
    transport = RecordingTransport(EmailTransportError("authentication", True))
    inject(app, transport)
    token, product = prepare(client)
    response = _checkout(client, token)
    assert response.status_code == 201
    sale = db.session.query(Sale).one()
    assert response.get_json()["data"]["sale"]["email_status"] == "failed"
    assert sale.email_status == "failed" and sale.email_error_code == "authentication"
    assert sale.email_attempts == 1 and sale.email_sent_at is None
    assert not sale.email_in_flight
    assert _checkout(client, token).get_json() == response.get_json()
    assert retry(client, token, sale.id).status_code == 200  # Cooldown: no send.
    assert len(transport.messages) == 1
    allow_retry(sale)
    transport.error = None
    result = retry(client, token, sale.id)
    assert result.get_json()["data"]["sale"]["email_status"] == "sent"
    assert len(transport.messages) == 2
    assert transport.messages[0]["Message-ID"] == transport.messages[1]["Message-ID"]
    assert sale.email_attempts == 2
    assert db.session.query(Sale).count() == 1
    assert db.session.get(Product, product.id).stock == 3
    assert "ana@example.com" not in caplog.text
    assert "Calle 1" not in caplog.text


def test_attempt_limit_blocks_further_network_calls(client, app):
    transport = RecordingTransport(EmailTransportError("connection", True))
    inject(app, transport)
    token, _ = prepare(client)
    _checkout(client, token)
    sale = db.session.query(Sale).one()
    for _ in range(4):
        allow_retry(sale)
        assert retry(client, token, sale.id).status_code == 200
    assert len(transport.messages) == sale.email_attempts == 3
    assert sale.email_status == "failed"


def test_uncertain_delivery_never_retries_automatically_or_on_retry_endpoint(client, app):
    transport = RecordingTransport(EmailTransportError("delivery_unknown"))
    inject(app, transport)
    token, _ = prepare(client)
    response = _checkout(client, token)
    sale = db.session.query(Sale).one()
    assert response.status_code == 201 and sale.email_status == "failed"
    allow_retry(sale)
    assert retry(client, token, sale.id).get_json()["data"]["sale"]["email_status"] == "failed"
    assert _checkout(client, token).status_code == 201
    assert len(transport.messages) == 1


@pytest.mark.parametrize(
    "error", [TypeError("Programming failure"), ValueError("Programming failure")]
)
def test_programming_error_is_not_mislabeled_as_smtp_failure(client, app, error):
    transport = RecordingTransport(error)
    inject(app, transport)
    token, product = prepare(client)
    with pytest.raises(type(error), match="Programming failure"):
        _checkout(client, token)
    sale = db.session.query(Sale).one()
    assert sale.email_status == "pending" and sale.email_in_flight
    assert sale.email_error_code is None and sale.email_attempts == 1
    assert db.session.query(Invoice).count() == 1
    assert db.session.get(Product, product.id).stock == 3
    assert _checkout(client, token).status_code == 201
    assert retry(client, token, sale.id).status_code == 200
    assert len(transport.messages) == 1


def test_outcome_database_failure_leaves_claim_and_never_resends(client, app, monkeypatch):
    transport = RecordingTransport()
    inject(app, transport)
    token, _ = prepare(client)

    def fail(*args, **kwargs):
        raise OperationalError("private statement", {}, Exception("private diagnostics"))

    monkeypatch.setattr(EmailRepository, "finish", fail)
    response = _checkout(client, token)
    sale = db.session.query(Sale).one()
    assert response.status_code == 201
    assert sale.email_status == "pending" and sale.email_in_flight
    assert "private" not in response.get_data(as_text=True)
    assert retry(client, token, sale.id).status_code == 200
    assert len(transport.messages) == 1


def test_retry_ownership_role_and_purchase_state(client, app):
    transport = RecordingTransport()
    inject(app, transport)
    app.config["EMAIL_ENABLED"] = False
    token, _ = prepare(client)
    _checkout(client, token)
    sale = db.session.query(Sale).one()
    other = _client_token(client, "other@example.com")
    admin = _admin_token(client)
    assert retry(client, other, sale.id).status_code == 404
    assert retry(client, admin, sale.id).status_code == 403
    assert client.post(f"/sales/{sale.id}/email/retry").status_code == 401
    assert client.post(f"/sales/{sale.id}/cancel", headers=auth_header(token)).status_code == 200
    app.config["EMAIL_ENABLED"] = True
    assert retry(client, token, sale.id).status_code == 200
    assert not transport.messages


def test_pending_claim_fences_reentrant_delivery(client, app):
    transport = RecordingTransport()
    inject(app, transport)
    original = transport.send

    def nested_send(message):
        sale = db.session.query(Sale).one()
        app.extensions["email_service"].deliver(sale.id, retry=True)
        original(message)

    transport.send = nested_send
    token, _ = prepare(client)
    assert _checkout(client, token).status_code == 201
    assert len(transport.messages) == 1


def test_factory_accepts_injected_transport():
    transport = RecordingTransport()
    test_app = create_app(TestConfig, email_transport=transport)
    assert test_app.extensions["email_service"].transport is transport


@pytest.fixture()
def smtp_mock(app, monkeypatch):
    configure_email(app)
    smtp = Mock()
    smtp.send_message.return_value = {}
    factory = Mock(return_value=smtp)
    monkeypatch.setattr("smtplib.SMTP", factory)
    monkeypatch.setattr("smtplib.SMTP_SSL", factory)
    return smtp, factory


@pytest.mark.parametrize("security,port", [("starttls", 587), ("ssl", 465)])
def test_smtp_uses_explicit_tls_timeout_and_envelope(client, app, smtp_mock, security, port):
    smtp, factory = smtp_mock
    app.config.update(
        SMTP_SECURITY=security,
        SMTP_PORT=port,
        SMTP_USERNAME="test-only-user",
        SMTP_PASSWORD="test-only-password",
    )
    token, _ = prepare(client)
    response = _checkout(client, token)
    assert response.get_json()["data"]["sale"]["email_status"] == "sent"
    assert factory.call_args.args == ("smtp.example.com", port)
    assert factory.call_args.kwargs["timeout"] == 5
    if security == "starttls":
        context = smtp.starttls.call_args.kwargs["context"]
    else:
        context = factory.call_args.kwargs["context"]
        smtp.starttls.assert_not_called()
    assert context.check_hostname and context.verify_mode != 0
    smtp.login.assert_called_once_with("test-only-user", "test-only-password")
    assert smtp.send_message.call_args.kwargs == {
        "from_addr": "confirmaciones@example.com",
        "to_addrs": ["ana@example.com"],
    }
    smtp.close.assert_called_once()


@pytest.mark.parametrize(
    "phase,error,code",
    [
        ("connect", TimeoutError("private timeout"), "connection"),
        ("connect", OSError("private host"), "connection"),
        (
            "login",
            smtplib.SMTPAuthenticationError(535, b"private authentication"),
            "authentication",
        ),
        ("tls", smtplib.SMTPNotSupportedError("private TLS"), "secure_connection"),
        ("send", TimeoutError("private timeout"), "delivery_unknown"),
        ("send", smtplib.SMTPServerDisconnected("private disconnect"), "delivery_unknown"),
        ("send", smtplib.SMTPDataError(550, b"private response"), "rejected"),
    ],
)
def test_expected_smtp_errors_are_safe_and_do_not_roll_back(
    client,
    app,
    smtp_mock,
    caplog,
    phase,
    error,
    code,
):
    smtp, factory = smtp_mock
    app.config.update(SMTP_USERNAME="test-only-user", SMTP_PASSWORD="test-only-password")
    if phase == "connect":
        factory.side_effect = error
    else:
        {"login": smtp.login, "tls": smtp.starttls, "send": smtp.send_message}[
            phase
        ].side_effect = error
    token, product = prepare(client)
    response = _checkout(client, token)
    sale = db.session.query(Sale).one()
    assert response.status_code == 201
    assert response.get_json()["data"]["sale"]["email_status"] == "failed"
    assert sale.email_error_code == code and sale.email_attempts == 1
    assert db.session.query(Sale).count() == db.session.query(Invoice).count() == 1
    assert db.session.get(Product, product.id).stock == 3
    assert "private" not in caplog.text + response.get_data(as_text=True)
    assert "test-only-password" not in caplog.text


@pytest.mark.parametrize(
    "recipient",
    [
        "ana@example.com\r\nBcc: hidden@example.com",
        "ana@example.com,other@example.com",
        "Ana <ana@example.com>",
    ],
)
def test_recipient_header_injection_is_rejected(client, app, recipient):
    transport = RecordingTransport()
    inject(app, transport)
    token, _ = prepare(client)
    payload = checkout_payload()
    payload["buyer_email"] = recipient
    response = _checkout(client, token, payload=payload)
    assert response.status_code == 400
    assert not transport.messages


def test_purchase_failure_does_not_attempt_email(client, app, monkeypatch):
    from app.repositories.invoice_repository import InvoiceRepository

    transport = RecordingTransport()
    inject(app, transport)
    token, _ = prepare(client)

    def fail(**kwargs):
        raise RuntimeError("pre-commit failure")

    monkeypatch.setattr(InvoiceRepository, "create", fail)
    assert _checkout(client, token).status_code == 503
    assert db.session.query(Sale).count() == 0
    assert not transport.messages


def test_stored_recipient_is_validated_before_transport(client, app):
    transport = RecordingTransport()
    inject(app, transport)
    app.config["EMAIL_ENABLED"] = False
    token, _ = prepare(client)
    _checkout(client, token)
    sale = db.session.query(Sale).one()
    sale.buyer_email = "ana@example.com\r\nBcc: hidden@example.com"
    db.session.commit()
    app.config["EMAIL_ENABLED"] = True
    response = retry(client, token, sale.id)
    assert response.status_code == 200
    assert response.get_json()["data"]["sale"]["email_status"] == "failed"
    assert sale.email_error_code == "invalid_address"
    assert sale.email_attempts == 0
    assert not transport.messages


def test_retry_uses_purchase_snapshots_after_product_changes(client, app):
    transport = RecordingTransport()
    inject(app, transport)
    app.config["EMAIL_ENABLED"] = False
    token, product = prepare(client)
    _checkout(client, token)
    sale = db.session.query(Sale).one()
    product.name = "Nombre nuevo"
    product.price = "99.99"
    db.session.commit()
    app.config["EMAIL_ENABLED"] = True
    assert retry(client, token, sale.id).status_code == 200
    content = transport.messages[0].get_content()
    assert "Alimento | Cantidad: 2 | Precio unitario: 12.50 | Subtotal: 25.00" in content
    assert "Nombre nuevo" not in content
    assert "99.99" not in content


@pytest.mark.parametrize(
    "changes",
    [
        {"email_status": "other"},
        {"email_attempts": 4},
        {"email_status": "sent"},
        {"email_in_flight": True},
        {"email_error_code": "raw provider response"},
    ],
)
def test_persisted_email_metadata_constraints(client, changes):
    from sqlalchemy.exc import IntegrityError

    token, _ = prepare(client)
    _checkout(client, token)
    sale = db.session.query(Sale).one()
    for field, value in changes.items():
        setattr(sale, field, value)
    with pytest.raises(IntegrityError):
        db.session.flush()
    db.session.rollback()
    assert db.session.query(Sale).count() == db.session.query(Invoice).count() == 1


@pytest.mark.parametrize(
    "address,expected",
    [
        (
            "Del parque de San José, 200 metros al norte.",
            "Del parque de San José, 200 metros al norte.",
        ),
        ("Edificio azul.\nApartamento  3.", "Edificio azul.\nApartamento  3."),
    ],
)
def test_email_uses_text_snapshot_and_replay_does_not_resend(client, app, address, expected):
    transport = RecordingTransport()
    inject(app, transport)
    token, product = prepare(client)
    payload = checkout_payload()
    payload["shipping_address"] = address
    response = _checkout(client, token, payload=payload)
    assert response.status_code == 201
    assert f"Dirección de envío:\n{expected}\n\n" in transport.messages[0].get_content()
    assert _checkout(client, token, payload=payload).get_json() == response.get_json()
    assert len(transport.messages) == 1
    assert product.stock == 3
    assert db.session.query(Sale).count() == db.session.query(Invoice).count() == 1


def test_email_retry_formats_legacy_address_without_mutating_snapshot(client, app):
    transport = RecordingTransport()
    inject(app, transport)
    app.config["EMAIL_ENABLED"] = False
    token, _ = prepare(client)
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
    app.config["EMAIL_ENABLED"] = True
    assert retry(client, token, sale.id).status_code == 200
    content = transport.messages[0].get_content()
    assert "Dirección de envío:\nCalle 1\nSan José\nSan José\n10101\nCR\n\n" in content
    assert "None" not in content and "{'" not in content
    assert sale.shipping_address == legacy


@pytest.mark.parametrize(
    "value,expected",
    [
        (None, []),
        ([], []),
        (42, []),
        ({"unknown": "private"}, []),
        ({"line1": {}, "city": None, "country": []}, []),
        ({"line1": "Calle 1", "line2": " ", "city": "San José"}, ["Calle 1", "San José"]),
        ("  Calle 1\r\n\r\nApartamento  3.  ", ["Calle 1", "", "Apartamento  3."]),
        ("Calle\x00azul", []),
    ],
)
def test_shipping_display_formatter_fails_safely_for_malformed_values(value, expected):
    from copy import deepcopy

    from app.services.email_service import format_shipping_address

    original = deepcopy(value)
    assert format_shipping_address(value) == expected
    assert value == original
