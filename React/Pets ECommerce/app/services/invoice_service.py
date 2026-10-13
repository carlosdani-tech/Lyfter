from app.repositories.invoice_repository import InvoiceRepository
from app.services.auth_service import ADMIN_ROLE
from app.services.sale_service import serialize_invoice


class InvoiceError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class InvoiceService:
    @staticmethod
    def list_invoices(user_id: int, role: str) -> dict:
        if role == ADMIN_ROLE:
            invoices = InvoiceRepository.list_all()
        else:
            invoices = InvoiceRepository.list_by_user_id(user_id)

        return {"invoices": [serialize_invoice(invoice) for invoice in invoices]}

    @staticmethod
    def get_invoice(invoice_id: int, user_id: int, role: str) -> dict:
        invoice = InvoiceRepository.get_by_id(invoice_id)
        if not invoice:
            raise InvoiceError("Invoice not found.", 404)

        if role != ADMIN_ROLE and invoice.sale.user_id != user_id:
            raise InvoiceError("You cannot access this invoice.", 403)

        return {"invoice": serialize_invoice(invoice)}
