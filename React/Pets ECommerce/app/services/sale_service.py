from decimal import Decimal
from typing import Any, cast

from app.extensions import db
from app.models.mixins import utc_now
from app.repositories.cart_repository import CartRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.sale_repository import SaleRepository
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
    return str(value.quantize(Decimal("0.01")))


def serialize_sale_item(item) -> dict:
    return {
        "id": item.id,
        "product_id": item.product_id,
        "product_name": item.product.name,
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
        "issued_at": invoice.issued_at.isoformat() if invoice.issued_at else None,
        "sale": {
            "id": sale.id,
            "user_id": sale.user_id,
            "status": sale.status,
            "subtotal_amount": _money(sale.subtotal_amount),
            "tax_amount": _money(sale.tax_amount),
            "total_amount": _money(sale.total_amount),
            "items": [serialize_sale_item(item) for item in sale_items],
            "completed_at": sale.completed_at.isoformat() if sale.completed_at else None,
            "cancelled_at": sale.cancelled_at.isoformat() if sale.cancelled_at else None,
            "returned_at": sale.returned_at.isoformat() if sale.returned_at else None,
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
        "subtotal_amount": _money(sale.subtotal_amount),
        "tax_amount": _money(sale.tax_amount),
        "total_amount": _money(sale.total_amount),
        "items": [serialize_sale_item(item) for item in sale_items],
        "invoice": serialize_invoice(invoice) if invoice else None,
        "completed_at": sale.completed_at.isoformat() if sale.completed_at else None,
        "cancelled_at": sale.cancelled_at.isoformat() if sale.cancelled_at else None,
        "returned_at": sale.returned_at.isoformat() if sale.returned_at else None,
    }


class SaleService:
    @staticmethod
    def checkout(user_id: int) -> dict:
        cart = CartRepository.get_active_by_user_id(user_id)
        if not cart:
            raise SaleError("Active cart has no items.", 400)

        cart_items = cast(list[Any], cart.items)
        if not cart_items:
            raise SaleError("Active cart has no items.", 400)

        for item in cart_items:
            if not item.product or not item.product.is_active:
                raise SaleError("Product not found.", 404)
            if item.quantity > item.product.stock:
                raise SaleError("Insufficient stock for one or more products.", 400)

        product_ids = {item.product_id for item in cart_items}

        try:
            subtotal = sum(
                (item.product.price * item.quantity for item in cart_items),
                Decimal("0.00"),
            )
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
            )

            for item in cart_items:
                unit_price = item.product.price
                line_total = unit_price * item.quantity
                SaleRepository.add_item(
                    sale_id=sale.id,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    unit_price=unit_price,
                    line_total=line_total,
                )
                ProductRepository.reduce_stock(item.product, item.quantity)

            cart.status = CHECKED_OUT_CART_STATUS
            db.session.flush()

            invoice = InvoiceRepository.create(
                sale_id=sale.id,
                invoice_number=f"INV-{sale.id:06d}",
                status=ISSUED_INVOICE_STATUS,
                total_amount=total_amount,
                issued_at=now,
            )

            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

        for product_id in product_ids:
            ProductService.invalidate_product_cache(product_id)

        return {"sale": serialize_sale(sale), "invoice": serialize_invoice(invoice)}

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
            for item in sale_items:
                ProductRepository.restore_stock(item.product, item.quantity)

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
            for item in sale_items:
                ProductRepository.restore_stock(item.product, item.quantity)

            SaleRepository.update_status(sale, RETURNED_STATUS, returned_at=utc_now())
            InvoiceRepository.update_status(invoice, REFUNDED_INVOICE_STATUS)
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

        for product_id in product_ids:
            ProductService.invalidate_product_cache(product_id)

        return {"sale": serialize_sale(sale), "invoice": serialize_invoice(invoice)}
