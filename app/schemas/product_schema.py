from decimal import Decimal, InvalidOperation


def _parse_decimal(value, field_name: str, errors: dict) -> Decimal | None:
    if value is None or value == "":
        errors[field_name] = f"{field_name} is required."
        return None

    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        errors[field_name] = f"{field_name} must be a valid decimal number."
        return None


def _parse_integer(value, field_name: str, errors: dict) -> int | None:
    if value is None or value == "":
        errors[field_name] = f"{field_name} is required."
        return None

    if isinstance(value, bool):
        errors[field_name] = f"{field_name} must be an integer."
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        errors[field_name] = f"{field_name} must be an integer."
        return None


def _parse_boolean(value, field_name: str, errors: dict) -> bool | None:
    if isinstance(value, bool):
        return value

    errors[field_name] = f"{field_name} must be a boolean."
    return None


def _parse_optional_string(
    payload: dict,
    field_name: str,
    max_length: int,
    errors: dict,
) -> str | None:
    value = payload.get(field_name)
    if value is None:
        return None

    cleaned = str(value).strip()
    if not cleaned:
        return None

    if len(cleaned) > max_length:
        errors[field_name] = f"{field_name} must be at most {max_length} characters."
        return None

    return cleaned


def validate_create_product_payload(payload: dict | None) -> dict:
    errors = {}
    payload = payload or {}

    name = str(payload.get("name", "")).strip()
    price = _parse_decimal(payload.get("price"), "price", errors)
    stock = _parse_integer(payload.get("stock"), "stock", errors)
    description = _parse_optional_string(payload, "description", 10_000, errors)
    image_url = _parse_optional_string(payload, "image_url", 500, errors)
    is_active = True

    if "is_active" in payload:
        is_active = _parse_boolean(payload.get("is_active"), "is_active", errors)

    if not name:
        errors["name"] = "Name is required."
    elif len(name) > 150:
        errors["name"] = "Name must be at most 150 characters."

    if price is not None and price < 0:
        errors["price"] = "Price must be greater than or equal to 0."

    if stock is not None and stock < 0:
        errors["stock"] = "Stock must be greater than or equal to 0."

    if errors:
        raise ValueError(errors)

    return {
        "name": name,
        "description": description,
        "price": price,
        "stock": stock,
        "image_url": image_url,
        "is_active": is_active,
    }


def validate_update_product_payload(payload: dict | None) -> dict:
    errors = {}
    payload = payload or {}
    allowed_fields = {"name", "description", "price", "stock", "image_url", "is_active"}
    update_data = {}

    if not any(field in payload for field in allowed_fields):
        errors["payload"] = "At least one product field is required."

    if "name" in payload:
        name = str(payload.get("name", "")).strip()
        if not name:
            errors["name"] = "Name cannot be empty."
        elif len(name) > 150:
            errors["name"] = "Name must be at most 150 characters."
        else:
            update_data["name"] = name

    if "description" in payload:
        update_data["description"] = _parse_optional_string(
            payload,
            "description",
            10_000,
            errors,
        )

    if "price" in payload:
        price = _parse_decimal(payload.get("price"), "price", errors)
        if price is not None:
            if price < 0:
                errors["price"] = "Price must be greater than or equal to 0."
            else:
                update_data["price"] = price

    if "stock" in payload:
        stock = _parse_integer(payload.get("stock"), "stock", errors)
        if stock is not None:
            if stock < 0:
                errors["stock"] = "Stock must be greater than or equal to 0."
            else:
                update_data["stock"] = stock

    if "image_url" in payload:
        update_data["image_url"] = _parse_optional_string(
            payload,
            "image_url",
            500,
            errors,
        )

    if "is_active" in payload:
        is_active = _parse_boolean(payload.get("is_active"), "is_active", errors)
        if is_active is not None:
            update_data["is_active"] = is_active

    if errors:
        raise ValueError(errors)

    return update_data
