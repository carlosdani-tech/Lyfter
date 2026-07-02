ALLOWED_PAYMENT_METHODS = {"credit_card", "debit_card", "cash", "transfer"}
SENSITIVE_PAYMENT_FIELDS = {"card_number", "cvv", "cvc", "security_code"}


def validate_checkout_payload(payload: dict | None) -> dict:
    errors = {}
    payload = payload or {}

    for field in SENSITIVE_PAYMENT_FIELDS:
        if field in payload:
            errors[field] = f"{field} cannot be stored."

    billing_address = str(payload.get("billing_address", "")).strip()
    payment_method = str(payload.get("payment_method", "")).strip().lower()
    payment_reference = str(payload.get("payment_reference", "")).strip()

    if not billing_address:
        errors["billing_address"] = "Billing address is required."
    elif len(billing_address) > 500:
        errors["billing_address"] = "Billing address must be at most 500 characters."

    if not payment_method:
        errors["payment_method"] = "Payment method is required."
    elif payment_method not in ALLOWED_PAYMENT_METHODS:
        errors["payment_method"] = (
            "Payment method must be one of: cash, credit_card, debit_card, transfer."
        )

    if not payment_reference:
        errors["payment_reference"] = "Payment reference is required."
    elif len(payment_reference) > 100:
        errors["payment_reference"] = "Payment reference must be at most 100 characters."

    if errors:
        raise ValueError(errors)

    return {
        "billing_address": billing_address,
        "payment_method": payment_method,
        "payment_reference": payment_reference,
    }
