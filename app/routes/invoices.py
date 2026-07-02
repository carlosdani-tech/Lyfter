from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.services.invoice_service import InvoiceError, InvoiceService
from app.utils.responses import error_response, success_response
from flask import Blueprint

invoices_bp = Blueprint("invoices", __name__, url_prefix="/invoices")


def _current_user_context() -> tuple[int, str]:
    return int(get_jwt_identity()), str(get_jwt().get("role") or "")


@invoices_bp.get("/health")
def invoices_health():
    return {"module": "invoices", "status": "ok"}


@invoices_bp.get("")
@jwt_required()
def list_invoices():
    user_id, role = _current_user_context()
    data = InvoiceService.list_invoices(user_id, role)
    return success_response(data)


@invoices_bp.get("/<int:invoice_id>")
@jwt_required()
def get_invoice(invoice_id: int):
    user_id, role = _current_user_context()
    try:
        data = InvoiceService.get_invoice(invoice_id, user_id, role)
    except InvoiceError as error:
        return error_response(error.message, error.status_code)

    return success_response(data)

