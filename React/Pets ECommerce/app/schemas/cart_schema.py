def _parse_quantity(value, errors: dict) -> int | None:
    if value is None or value == "":
        errors["quantity"] = "Quantity is required."
        return None

    if isinstance(value, bool):
        errors["quantity"] = "Quantity must be an integer."
        return None

    try:
        quantity = int(value)
    except (TypeError, ValueError):
        errors["quantity"] = "Quantity must be an integer."
        return None

    if quantity <= 0:
        errors["quantity"] = "Quantity must be greater than 0."
        return None

    return quantity


def validate_add_cart_item_payload(payload: dict | None) -> dict:
    errors = {}
    payload = payload or {}

    product_id = payload.get("product_id")
    if product_id is None or product_id == "":
        errors["product_id"] = "Product id is required."
    elif isinstance(product_id, bool):
        errors["product_id"] = "Product id must be an integer."
    else:
        try:
            product_id = int(product_id)
        except (TypeError, ValueError):
            errors["product_id"] = "Product id must be an integer."

    quantity = _parse_quantity(payload.get("quantity"), errors)

    if errors:
        raise ValueError(errors)

    return {"product_id": product_id, "quantity": quantity}


def validate_update_cart_item_payload(payload: dict | None) -> dict:
    errors = {}
    payload = payload or {}
    quantity = _parse_quantity(payload.get("quantity"), errors)

    if errors:
        raise ValueError(errors)

    return {"quantity": quantity}
