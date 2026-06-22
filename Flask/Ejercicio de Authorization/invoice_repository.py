from decimal import Decimal

from models import Invoice, InvoiceItem, Product


class SaleValidationError(Exception):
    pass


class InsufficientStockError(Exception):
    pass


class InvoiceRepository:
    def __init__(self, session):
        self.session = session

    def create_invoice(self, user, items):
        if not items:
            raise SaleValidationError("At least one product is required to create an invoice.")

        normalized_items = []
        total = Decimal("0.00")

        for item in items:
            product = self.session.get(Product, item["product_id"])
            if product is None:
                raise SaleValidationError(f"Product {item['product_id']} does not exist.")

            quantity = item["quantity"]
            if quantity <= 0:
                raise SaleValidationError("Quantity must be greater than zero.")
            if product.quantity < quantity:
                raise InsufficientStockError(
                    f"Product {product.id} does not have enough stock for quantity {quantity}."
                )

            unit_price = Decimal(product.price)
            subtotal = unit_price * quantity
            total += subtotal
            normalized_items.append((product, quantity, unit_price, subtotal))

        invoice = Invoice(user=user, total=total)
        self.session.add(invoice)
        self.session.flush()

        for product, quantity, unit_price, subtotal in normalized_items:
            product.quantity -= quantity
            self.session.add(
                InvoiceItem(
                    invoice=invoice,
                    product=product,
                    quantity=quantity,
                    unit_price=unit_price,
                    subtotal=subtotal,
                )
            )

        self.session.flush()
        return invoice

    def list_invoices(self, user_id=None):
        query = self.session.query(Invoice).order_by(Invoice.id.desc())
        if user_id is not None:
            query = query.filter(Invoice.user_id == user_id)
        return query.all()

    def get_by_id(self, invoice_id):
        return self.session.query(Invoice).filter(Invoice.id == invoice_id).first()
