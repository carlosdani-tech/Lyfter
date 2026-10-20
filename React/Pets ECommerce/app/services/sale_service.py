import hashlib
import json
from datetime import UTC
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, cast

from flask import current_app

from app.extensions import db
from app.models.mixins import utc_now
from app.repositories.cart_repository import CartRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.sale_repository import SaleRepository
from app.repositories.user_repository import UserRepository
from app.services.product_service import ProductService

COMPLETED_STATUS = "completed"
CANCELLED_STATUS = "cancelled"
RETURNED_STATUS = "returned"
ISSUED_INVOICE_STATUS = "issued"
CANCELLED_INVOICE_STATUS = "cancelled"
REFUNDED_INVOICE_STATUS = "refunded"
CHECKED_OUT_CART_STATUS = "checked_out"


class SaleError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _money(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _timestamp(value):
    if value is None:
        return None
    return value.replace(tzinfo=UTC).isoformat() if value.tzinfo is None else value.isoformat()


def serialize_sale_item(item) -> dict:
    return {
        "id": item.id,
        "product_id": item.product_id,
        "product_name": item.product_name,
        "quantity": item.quantity,
        "unit_price": _money(item.unit_price),
        "line_total": _money(item.line_total),
    }


def serialize_invoice(invoice) -> dict:
    sale = invoice.sale
    sale_items = cast(list[Any], sale.items)
    return {
        "id": invoice.id,
        "sale_id": invoice.sale_id,
        "invoice_number": invoice.invoice_number,
        "status": invoice.status,
        "total_amount": _money(invoice.total_amount),
        "issued_at": _timestamp(invoice.issued_at),
        "sale": {
            "id": sale.id,
            "user_id": sale.user_id,
            "status": sale.status,
            "email_status": sale.email_status,
            "full_name": sale.full_name,
            "buyer_email": sale.buyer_email,
            "shipping_address": sale.shipping_address,
            "subtotal_amount": _money(sale.subtotal_amount),
            "tax_amount": _money(sale.tax_amount),
            "total_amount": _money(sale.total_amount),
            "items": [serialize_sale_item(item) for item in sale_items],
            "completed_at": _timestamp(sale.completed_at),
            "cancelled_at": _timestamp(sale.cancelled_at),
            "returned_at": _timestamp(sale.returned_at),
        },
    }


def serialize_sale(sale) -> dict:
    sale_items = cast(list[Any], sale.items)
    invoice = cast(Any, sale.invoice)
    return {
        "id": sale.id,
        "user_id": sale.user_id,
        "cart_id": sale.cart_id,
        "status": sale.status,
        "email_status": sale.email_status,
        "full_name": sale.full_name,
        "buyer_email": sale.buyer_email,
        "shipping_address": sale.shipping_address,
        "subtotal_amount": _money(sale.subtotal_amount),
        "tax_amount": _money(sale.tax_amount),
        "total_amount": _money(sale.total_amount),
        "items": [serialize_sale_item(item) for item in sale_items],
        "invoice": serialize_invoice(invoice) if invoice else None,
        "completed_at": _timestamp(sale.completed_at),
        "cancelled_at": _timestamp(sale.cancelled_at),
        "returned_at": _timestamp(sale.returned_at),
    }


class SaleService:
    @staticmethod
    def checkout(user_id: int, payload: dict, idempotency_key: str) -> dict:
        fingerprint = hashlib.sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        try:
            # Serializes checkout and cart writes, including first-cart creation.
            user = UserRepository.lock_by_id(user_id)
            if not user or not user.is_active or user.role.name != "client":
                raise SaleError("Client permission is required.", 403)
            existing = SaleRepository.get_by_checkout_key(user_id, idempotency_key)
            if existing:
                if existing.request_fingerprint != fingerprint:
                    raise SaleError("Idempotency key was already used with different details.", 409)
                data = {
                    "sale": serialize_sale(existing),
                    "invoice": serialize_invoice(existing.invoice),
                }
                db.session.commit()
                return data
            cart = CartRepository.get_active_by_user_id(user_id)
            if not cart:
                raise SaleError("Active cart has no items.", 400)
            cart_items = CartRepository.lock_items(cart.id)
            if not cart_items:
                raise SaleError("Active cart has no items.", 400)
            product_ids = {item.product_id for item in cart_items}
            products = {p.id: p for p in ProductRepository.lock_by_ids(product_ids)}
            for item in cart_items:
                product = products.get(item.product_id)
                if not product or not product.is_active:
                    raise SaleError("Product not found.", 404)
                if item.quantity <= 0 or item.quantity > product.stock:
                    raise SaleError("Insufficient stock for one or more products.", 400)
            subtotal = sum(
                (products[item.product_id].price * item.quantity for item in cart_items),
                Decimal("0.00"),
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if subtotal > Decimal("99999999.99"):
                raise SaleError("Purchase total exceeds the supported limit.", 400)
            tax_amount = Decimal("0.00")
            total_amount = subtotal + tax_amount
            now = utc_now()

            sale = SaleRepository.create(
                user_id=user_id,
                cart_id=cart.id,
                status=COMPLETED_STATUS,
                subtotal_amount=subtotal,
                tax_amount=tax_amount,
                total_amount=total_amount,
                completed_at=now,
                idempotency_key=idempotency_key,
                request_fingerprint=fingerprint,
                full_name=payload["full_name"],
                buyer_email=payload["buyer_email"],
                shipping_address=dict(payload["shipping_address"]),
            )

            for item in cart_items:
                product = products[item.product_id]
                unit_price = product.price
                line_total = unit_price * item.quantity
                SaleRepository.add_item(
                    sale_id=sale.id,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    product_name=product.name,
                    unit_price=unit_price,
                    line_total=line_total,
                )
                ProductRepository.reduce_stock(product, item.quantity)

            cart.status = CHECKED_OUT_CART_STATUS
            db.session.flush()

            invoice = InvoiceRepository.create(
                sale_id=sale.id,
                invoice_number=f"INV-{sale.id:06d}",
                status=ISSUED_INVOICE_STATUS,
                total_amount=total_amount,
                issued_at=now,
            )

            data = {"sale": serialize_sale(sale), "invoice": serialize_invoice(invoice)}
            db.session.commit()
        except SaleError:
            db.session.rollback()
            raise
        except Exception:
            db.session.rollback()
            raise SaleError(
                "Checkout could not be completed. Retry with the same key.",
                503,
            ) from None

        for product_id in product_ids:
            ProductService.invalidate_product_cache(product_id)

        current_app.extensions["email_service"].deliver(sale.id)
        return SaleService.get_confirmation(sale.id, user_id)

    @staticmethod
    def retry_email(sale_id: int, user_id: int) -> dict:
        SaleService.get_confirmation(sale_id, user_id)
        db.session.commit()  # Release the ownership lookup lock before claiming delivery.
        current_app.extensions["email_service"].deliver(sale_id, retry=True)
        return SaleService.get_confirmation(sale_id, user_id)

    @staticmethod
    def get_confirmation(sale_id: int, user_id: int) -> dict:
        sale = SaleRepository.get_by_id(sale_id)
        if not sale or sale.user_id != user_id:
            raise SaleError("Sale not found.", 404)
        return {"sale": serialize_sale(sale), "invoice": serialize_invoice(sale.invoice)}

    @staticmethod
    def cancel_sale(sale_id: int, user_id: int | None = None, is_admin: bool = False) -> dict:
        sale = SaleRepository.get_by_id(sale_id)
        if not sale:
            raise SaleError("Sale not found.", 404)
        if not is_admin and sale.user_id != user_id:
            raise SaleError("You cannot access this sale.", 403)
        if sale.status != COMPLETED_STATUS:
            raise SaleError("Sale cannot be cancelled.", 400)

        sale_items = cast(list[Any], sale.items)
        product_ids = {item.product_id for item in sale_items}
        invoice = cast(Any, sale.invoice)

        try:
            products = {p.id: p for p in ProductRepository.lock_by_ids(product_ids)}
            for item in sale_items:
                ProductRepository.restore_stock(products[item.product_id], item.quantity)

            SaleRepository.update_status(sale, CANCELLED_STATUS, cancelled_at=utc_now())
            InvoiceRepository.update_status(invoice, CANCELLED_INVOICE_STATUS)
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

        for product_id in product_ids:
            ProductService.invalidate_product_cache(product_id)

        return {"sale": serialize_sale(sale), "invoice": serialize_invoice(invoice)}

    @staticmethod
    def return_sale(sale_id: int, user_id: int | None = None, is_admin: bool = False) -> dict:
        sale = SaleRepository.get_by_id(sale_id)
        if not sale:
            raise SaleError("Sale not found.", 404)
        if not is_admin and sale.user_id != user_id:
            raise SaleError("You cannot access this sale.", 403)
        if sale.status != COMPLETED_STATUS:
            raise SaleError("Sale cannot be returned.", 400)

        sale_items = cast(list[Any], sale.items)
        product_ids = {item.product_id for item in sale_items}
        invoice = cast(Any, sale.invoice)

        try:
            products = {p.id: p for p in ProductRepository.lock_by_ids(product_ids)}
            for item in sale_items:
                ProductRepository.restore_stock(products[item.product_id], item.quantity)

            SaleRepository.update_status(sale, RETURNED_STATUS, returned_at=utc_now())
            InvoiceRepository.update_status(invoice, REFUNDED_INVOICE_STATUS)
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

        for product_id in product_ids:
            ProductService.invalidate_product_cache(product_id)

        return {"sale": serialize_sale(sale), "invoice": serialize_invoice(invoice)}
