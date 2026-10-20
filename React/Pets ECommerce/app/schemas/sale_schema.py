import re

EMAIL_PATTERN = re.compile(r"[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+")
KEY_PATTERN = re.compile(r"[A-Za-z0-9._:-]{1,128}")
ADDRESS_LIMITS = {
    "line1": 200,
    "line2": 200,
    "city": 100,
    "province": 100,
    "postal_code": 20,
    "country": 2,
}


def _text(value, field, limit, errors, optional=False):
    if value is None and optional:
        return None
    if not isinstance(value, str):
        errors[field] = "Must be a string."
        return None
    value = value.strip()
    if not value and optional:
        return None
    if not value or len(value) > limit or any(ord(char) < 32 for char in value):
        errors[field] = f"Must contain 1 to {limit} characters without control characters."
    return value


def validate_checkout_payload(payload, idempotency_key):
    errors = {}
    if not isinstance(payload, dict):
        raise ValueError({"body": "A JSON object is required."})
    if set(payload) - {"full_name", "buyer_email", "shipping_address"}:
        errors["body"] = "Unsupported fields."
    full_name = _text(payload.get("full_name"), "full_name", 200, errors)
    email = _text(payload.get("buyer_email"), "buyer_email", 254, errors)
    if email and not EMAIL_PATTERN.fullmatch(email):
        errors["buyer_email"] = "Must be a valid email address."
    address = payload.get("shipping_address")
    shipping = {}
    if not isinstance(address, dict):
        errors["shipping_address"] = "A shipping address object is required."
    else:
        if set(address) - set(ADDRESS_LIMITS):
            errors["shipping_address"] = "Unsupported address fields."
        for field, limit in ADDRESS_LIMITS.items():
            shipping[field] = _text(
                address.get(field),
                f"shipping_address.{field}",
                limit,
                errors,
                optional=field == "line2",
            )
        country = shipping.get("country")
        if country and not re.fullmatch(r"[A-Za-z]{2}", country):
            errors["shipping_address.country"] = "Must be a two-letter country code."
        elif country:
            shipping["country"] = country.upper()
    if not isinstance(idempotency_key, str) or not KEY_PATTERN.fullmatch(idempotency_key):
        errors["Idempotency-Key"] = "Required: 1 to 128 ASCII letters, digits, '.', '_', ':', '-'."
    if errors:
        raise ValueError(errors)
    return {"full_name": full_name, "buyer_email": email, "shipping_address": shipping}
