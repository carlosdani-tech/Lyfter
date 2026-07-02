from app.schemas.auth_schema import EMAIL_PATTERN


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


def _parse_boolean(value, field_name: str, errors: dict) -> bool | None:
    if isinstance(value, bool):
        return value

    errors[field_name] = f"{field_name} must be a boolean."
    return None


def validate_update_user_payload(payload: dict | None) -> dict:
    errors = {}
    payload = payload or {}
    allowed_fields = {"email", "first_name", "last_name", "is_active"}
    update_data = {}

    if not any(field in payload for field in allowed_fields):
        errors["payload"] = "At least one user field is required."

    blocked_fields = {"password", "password_hash", "role", "role_id"}
    for field in blocked_fields:
        if field in payload:
            errors[field] = f"{field} cannot be updated from this endpoint."

    if "email" in payload:
        email = str(payload.get("email", "")).strip().lower()
        if not email:
            errors["email"] = "Email cannot be empty."
        elif not EMAIL_PATTERN.match(email):
            errors["email"] = "Email format is invalid."
        elif len(email) > 255:
            errors["email"] = "Email must be at most 255 characters."
        else:
            update_data["email"] = email

    if "first_name" in payload:
        update_data["first_name"] = _parse_optional_string(payload, "first_name", 100, errors)

    if "last_name" in payload:
        update_data["last_name"] = _parse_optional_string(payload, "last_name", 100, errors)

    if "is_active" in payload:
        is_active = _parse_boolean(payload.get("is_active"), "is_active", errors)
        if is_active is not None:
            update_data["is_active"] = is_active

    if errors:
        raise ValueError(errors)

    return update_data
