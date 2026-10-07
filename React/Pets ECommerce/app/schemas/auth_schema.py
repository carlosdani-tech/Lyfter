import re

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8


def validate_register_payload(payload: dict | None) -> dict:
    errors = {}
    payload = payload or {}

    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    first_name = str(payload.get("first_name", "")).strip() or None
    last_name = str(payload.get("last_name", "")).strip() or None

    if not email:
        errors["email"] = "Email is required."
    elif not EMAIL_PATTERN.match(email):
        errors["email"] = "Email format is invalid."

    if not password:
        errors["password"] = "Password is required."
    elif len(password) < MIN_PASSWORD_LENGTH:
        errors["password"] = f"Password must be at least {MIN_PASSWORD_LENGTH} characters."

    if errors:
        raise ValueError(errors)

    return {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
    }


def validate_login_payload(payload: dict | None) -> dict:
    errors = {}
    payload = payload or {}

    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email:
        errors["email"] = "Email is required."

    if not password:
        errors["password"] = "Password is required."

    if errors:
        raise ValueError(errors)

    return {"email": email, "password": password}