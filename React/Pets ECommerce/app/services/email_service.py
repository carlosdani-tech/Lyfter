from datetime import UTC, timedelta
from email.message import EmailMessage
from typing import Protocol

from flask import current_app
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.mixins import utc_now
from app.repositories.email_repository import EmailRepository
from app.repositories.sale_repository import SaleRepository
from app.services.email_transport import EmailTransportError, validate_email_address

MAX_ATTEMPTS = 3
RETRY_DELAY = timedelta(seconds=60)
RETRY_SAFE_CODES = {
    "authentication",
    "connection",
    "secure_connection",
    "rejected",
    "configuration",
    "invalid_address",
    "disabled",
}


class EmailTransport(Protocol):
    def send(self, message: EmailMessage) -> None: ...


def build_confirmation(sale, sender):
    sender = validate_email_address(sender)
    recipient = validate_email_address(sale.buyer_email)
    message = EmailMessage()
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = f"Confirmación de tu compra en PawStore - {sale.invoice.invoice_number}"
    message["Message-ID"] = f"<pawstore-sale-{sale.id}@{sender.split('@')[1]}>"
    message["Date"] = sale.completed_at.replace(tzinfo=UTC)
    lines = [
        f"Hola, {sale.full_name}:",
        "",
        "Gracias por tu compra en PawStore.",
        f"Pedido: {sale.id}",
        f"Factura: {sale.invoice.invoice_number}",
        "",
        "Productos:",
    ]
    for item in sale.items:
        lines.append(
            f"{item.product_name} | Cantidad: {item.quantity} | "
            f"Precio unitario: {item.unit_price:.2f} | Subtotal: {item.line_total:.2f}"
        )
    lines += [
        "",
        f"Subtotal: {sale.subtotal_amount:.2f}",
        f"Impuestos: {sale.tax_amount:.2f}",
        f"Total: {sale.total_amount:.2f}",
        "",
        "Dirección de envío:",
    ]
    address = sale.shipping_address
    lines.extend(
        str(address[field])
        for field in (
            "line1",
            "line2",
            "city",
            "province",
            "postal_code",
            "country",
        )
        if address.get(field)
    )
    lines += ["", "Conserva esta confirmación como referencia de tu compra."]
    message.set_content("\n".join(lines))
    return message


class EmailService:
    def __init__(self, transport: EmailTransport):
        self.transport = transport

    def deliver(self, sale_id: int, *, retry=False):
        """Deliver only committed purchases; a persisted claim fences competing senders."""
        try:
            sale = SaleRepository.get_by_id(sale_id)
            if (
                not sale
                or sale.status != "completed"
                or not sale.idempotency_key
                or sale.email_status == "sent"
                or sale.email_in_flight
                or sale.email_attempts >= MAX_ATTEMPTS
                or (sale.email_status == "failed" and not retry)
                or (
                    retry
                    and sale.email_error_code not in RETRY_SAFE_CODES
                    and sale.email_status == "failed"
                )
            ):
                db.session.commit()
                return
            now = utc_now()
            if sale.email_last_attempt_at:
                last_attempt = sale.email_last_attempt_at.replace(tzinfo=UTC)
                if now - last_attempt < RETRY_DELAY:
                    db.session.commit()
                    return
            if not current_app.config.get("EMAIL_ENABLED"):
                EmailRepository.defer(sale, "disabled")
                db.session.commit()
                return
            try:
                message = build_confirmation(sale, current_app.config.get("SMTP_SENDER"))
            except EmailTransportError as error:
                EmailRepository.defer(sale, error.code, failed=True)
                db.session.commit()
                return
            attempt = sale.email_attempts + 1
            if not EmailRepository.claim(sale_id, sale.email_attempts, now):
                db.session.rollback()
                return
            db.session.commit()  # Durable fence before any network operation.
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.warning("Confirmation email state unavailable.")
            return

        try:
            self.transport.send(message)
        except EmailTransportError as error:
            code = error.code if error.code in RETRY_SAFE_CODES else "delivery_unknown"
            if not error.retry_safe:
                code = "delivery_unknown"
            sent_at = None
            current_app.logger.warning("Confirmation email attempt failed: %s", code)
        else:
            code, sent_at = None, utc_now()
        # Unexpected programming errors propagate and leave the durable claim intact.
        try:
            EmailRepository.finish(sale_id, attempt, code=code, sent_at=sent_at)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            # Leave the persisted claim for operator reconciliation; never blindly resend.
            current_app.logger.warning("Confirmation email outcome could not be persisted.")
