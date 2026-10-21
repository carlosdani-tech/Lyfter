import re
from decimal import Decimal

EMAIL_PATTERN = re.compile(r"[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+")
KEY_PATTERN = re.compile(r"[A-Za-z0-9._:-]{1,128}")


def _text(value, field, limit, errors):
    if not isinstance(value, str):
        errors[field] = "Must be a string."
        return None
    value = value.strip()
    if not value or len(value) > limit or any(ord(char) < 32 for char in value):
        errors[field] = f"Must contain 1 to {limit} characters without control characters."
    return value


def validate_checkout_payload(payload, idempotency_key):
    errors = {}
    if not isinstance(payload, dict):
        raise ValueError({"body": "A JSON object is required."})
    if set(payload) - {"full_name", "buyer_email", "shipping_address", "items", "total_amount"}:
        errors["body"] = "Unsupported fields."
    full_name = _text(payload.get("full_name"), "full_name", 200, errors)
    email = _text(payload.get("buyer_email"), "buyer_email", 254, errors)
    if email and not EMAIL_PATTERN.fullmatch(email):
        errors["buyer_email"] = "Must be a valid email address."
    address = payload.get("shipping_address")
    shipping = None
    if not isinstance(address, str):
        errors["shipping_address"] = "Must be a string."
    else:
        shipping = address.replace("\r\n", "\n").replace("\r", "\n").strip()
        if (
            not shipping
            or len(shipping) > 500
            or any(ord(char) < 32 and char != "\n" for char in shipping)
        ):
            errors["shipping_address"] = (
                "Must contain 1 to 500 characters without control characters except line breaks."
            )
    if not isinstance(idempotency_key, str) or not KEY_PATTERN.fullmatch(idempotency_key):
        errors["Idempotency-Key"] = "Required: 1 to 128 ASCII letters, digits, '.', '_', ':', '-'."
    items = payload.get("items")
    normalized_items = []
    seen = set()
    if not isinstance(items, list) or not 1 <= len(items) <= 1000:
        errors["items"] = "Must contain 1 to 1000 items."
    else:
        for item in items:
            if not isinstance(item, dict) or set(item) != {"product_id", "quantity"}:
                errors["items"] = "Each item must contain only product_id and quantity."
                continue
            if any(
                type(item[field]) is not int or not 1 <= item[field] <= 2147483647
                for field in ("product_id", "quantity")
            ):
                errors["items"] = (
                    "Product IDs and quantities must be positive integers "
                    "no greater than 2147483647."
                )
                continue
            if item["product_id"] in seen:
                errors["items"] = "Duplicate products are not allowed."
            seen.add(item["product_id"])
            normalized_items.append(
                {"product_id": item["product_id"], "quantity": item["quantity"]}
            )
    total = payload.get("total_amount")
    if (
        not isinstance(total, str)
        or len(total) > 11
        or not re.fullmatch(r"(0|[1-9][0-9]{0,7})\.[0-9]{2}", total)
    ):
        errors["total_amount"] = (
            "Must be a canonical two-decimal string between 0.00 and 99999999.99."
        )
    if errors:
        raise ValueError(errors)
    return {
        "full_name": full_name,
        "buyer_email": email,
        "shipping_address": shipping,
        "items": sorted(normalized_items, key=lambda item: item["product_id"]),
        "total_amount": format(Decimal(total), ".2f"),
    }
