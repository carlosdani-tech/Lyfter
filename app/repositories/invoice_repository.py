from app.extensions import db
from app.models import Invoice, Sale


class InvoiceRepository:
    @staticmethod
    def create(**invoice_data) -> Invoice:
        invoice = Invoice(**invoice_data)
        db.session.add(invoice)
        db.session.flush()
        return invoice

    @staticmethod
    def get_by_id(invoice_id: int) -> Invoice | None:
        return db.session.get(Invoice, invoice_id)

    @staticmethod
    def list_by_user_id(user_id: int) -> list[Invoice]:
        return (
            db.session.query(Invoice)
            .join(Sale, Invoice.sale_id == Sale.id)
            .filter(Sale.user_id == user_id)
            .order_by(Invoice.issued_at.desc())
            .all()
        )

    @staticmethod
    def list_all() -> list[Invoice]:
        return db.session.query(Invoice).order_by(Invoice.issued_at.desc()).all()

    @staticmethod
    def update_status(invoice: Invoice, status: str) -> Invoice:
        invoice.status = status
        db.session.flush()
        return invoice
