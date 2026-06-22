from datetime import date
from decimal import Decimal, InvalidOperation

import jwt
from flask import Flask, g, jsonify, request

from db import get_session, init_db
from invoice_repository import (
    InsufficientStockError,
    InvoiceRepository,
    SaleValidationError,
)
from jwt_manager import JWT_Manager
from product_repository import ProductRepository
from user_repository import UserRepository


ADMIN_ROLE = "admin"
USER_ROLE = "user"
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"

with open("private_key.pem", "r", encoding="utf-8") as private_file:
    PRIVATE_KEY = private_file.read()

with open("public_key.pem", "r", encoding="utf-8") as public_file:
    PUBLIC_KEY = public_file.read()

app = Flask("authorization-service")
jwt_manager = JWT_Manager(PRIVATE_KEY, PUBLIC_KEY)


def json_error(message, status_code):
    response = jsonify(error=message)
    response.status_code = status_code
    return response


def issue_token(user):
    return jwt_manager.encode(
        {
            "sub": str(user.id),
            "username": user.username,
            "role": user.role,
        }
    )


def require_auth(*allowed_roles):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, json_error("Unauthorized", 401)

    token = auth_header.replace("Bearer ", "", 1).strip()
    try:
        payload = jwt_manager.decode(token)
        user_id = int(payload.get("sub"))
    except (jwt.InvalidTokenError, TypeError, ValueError):
        return None, json_error("Unauthorized", 401)

    session = get_session()
    try:
        user = UserRepository(session).get_by_id(user_id)
        if user is None:
            return None, json_error("Unauthorized", 401)

        if allowed_roles and user.role not in allowed_roles:
            return None, json_error("Forbidden", 403)

        current_user = {
            "id": user.id,
            "username": user.username,
            "role": user.role,
        }
    finally:
        session.close()

    g.current_user = current_user
    return current_user, None


def bootstrap_admin():
    session = get_session()
    try:
        user_repository = UserRepository(session)
        user_repository.ensure_admin(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD)
        session.commit()
    finally:
        session.close()


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return json_error("Missing data", 400)

    session = get_session()
    try:
        user_repository = UserRepository(session)
        if user_repository.get_by_username(username) is not None:
            return json_error("User already exists", 409)

        user = user_repository.create_user(
            username=str(username).strip(),
            password=password,
            role=USER_ROLE,
        )
        response_body = {
            "token": issue_token(user),
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role,
            },
        }
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    return jsonify(response_body), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return json_error("Missing data", 400)

    session = get_session()
    try:
        user = UserRepository(session).verify_credentials(str(username).strip(), password)
        if user is None:
            return json_error("Invalid credentials", 401)

        response_body = {
            "token": issue_token(user),
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role,
            },
        }
    finally:
        session.close()

    return jsonify(response_body), 200


@app.route("/me", methods=["GET"])
def me():
    current_user, error = require_auth(ADMIN_ROLE, USER_ROLE)
    if error:
        return error
    return jsonify(current_user), 200


@app.route("/products", methods=["GET"])
def list_products():
    _, error = require_auth(ADMIN_ROLE, USER_ROLE)
    if error:
        return error

    session = get_session()
    try:
        products = ProductRepository(session).list_all()
        response_body = [
            {
                "id": product.id,
                "name": product.name,
                "price": float(product.price),
                "entry_date": product.entry_date.isoformat(),
                "quantity": product.quantity,
            }
            for product in products
        ]
    finally:
        session.close()
    return jsonify(response_body), 200


@app.route("/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    _, error = require_auth(ADMIN_ROLE, USER_ROLE)
    if error:
        return error

    session = get_session()
    try:
        product = ProductRepository(session).get_by_id(product_id)
        if product is None:
            return json_error("Product not found.", 404)
        response_body = {
            "id": product.id,
            "name": product.name,
            "price": float(product.price),
            "entry_date": product.entry_date.isoformat(),
            "quantity": product.quantity,
        }
    finally:
        session.close()
    return jsonify(response_body), 200


@app.route("/products", methods=["POST"])
def create_product():
    _, error = require_auth(ADMIN_ROLE)
    if error:
        return error

    data = request.get_json() or {}
    try:
        product_data = {
            "name": data["name"],
            "price": Decimal(str(data["price"])),
            "entry_date": date.fromisoformat(data["entry_date"]),
            "quantity": int(data["quantity"]),
        }
    except Exception:
        return json_error("Invalid data", 400)

    session = get_session()
    try:
        product = ProductRepository(session).create(**product_data)
        response_body = {
            "id": product.id,
            "name": product.name,
            "price": float(product.price),
            "entry_date": product.entry_date.isoformat(),
            "quantity": product.quantity,
        }
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    return jsonify(response_body), 201


@app.route("/products/<int:product_id>", methods=["PUT"])
def update_product(product_id):
    _, error = require_auth(ADMIN_ROLE)
    if error:
        return error

    data = request.get_json() or {}

    session = get_session()
    try:
        repository = ProductRepository(session)
        product = repository.get_by_id(product_id)
        if product is None:
            return json_error("Product not found", 404)

        if "name" in data:
            product.name = data["name"]
        if "price" in data:
            product.price = Decimal(str(data["price"]))
        if "entry_date" in data:
            product.entry_date = date.fromisoformat(data["entry_date"])
        if "quantity" in data:
            product.quantity = int(data["quantity"])

        repository.update(product)
        response_body = {
            "id": product.id,
            "name": product.name,
            "price": float(product.price),
            "entry_date": product.entry_date.isoformat(),
            "quantity": product.quantity,
        }
        session.commit()
    except (ValueError, InvalidOperation, TypeError):
        session.rollback()
        return json_error("Invalid data", 400)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    return jsonify(response_body), 200


@app.route("/products/<int:product_id>", methods=["DELETE"])
def delete_product(product_id):
    _, error = require_auth(ADMIN_ROLE)
    if error:
        return error

    session = get_session()
    try:
        repository = ProductRepository(session)
        product = repository.get_by_id(product_id)
        if product is None:
            return json_error("Product not found", 404)
        if product.invoice_items:
            return json_error("Product already used in an invoice", 409)

        repository.delete(product)
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    return "", 204


@app.route("/sales", methods=["POST"])
def create_sale():
    current_user, error = require_auth(ADMIN_ROLE, USER_ROLE)
    if error:
        return error

    data = request.get_json() or {}

    try:
        if "items" in data:
            items = []
            for item in data["items"]:
                items.append(
                    {
                        "product_id": int(item["product_id"]),
                        "quantity": int(item["quantity"]),
                    }
                )
        else:
            items = [
                {
                    "product_id": int(data["product_id"]),
                    "quantity": int(data["quantity"]),
                }
            ]
    except Exception:
        return json_error("Invalid data", 400)

    session = get_session()
    try:
        user_repository = UserRepository(session)
        invoice_repository = InvoiceRepository(session)
        user = user_repository.get_by_id(current_user["id"])

        try:
            invoice = invoice_repository.create_invoice(user, items)
        except SaleValidationError:
            return json_error("Invalid sale", 400)
        except InsufficientStockError:
            return json_error("Not enough stock", 409)

        response_body = {
            "id": invoice.id,
            "user": {
                "id": invoice.user.id,
                "username": invoice.user.username,
                "role": invoice.user.role,
            },
            "total": float(invoice.total),
            "created_at": invoice.created_at.isoformat(),
            "items": [
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "product_name": item.product.name,
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price),
                    "subtotal": float(item.subtotal),
                }
                for item in invoice.items
            ],
        }
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    return jsonify(response_body), 201


@app.route("/invoices", methods=["GET"])
def list_invoices():
    current_user, error = require_auth(ADMIN_ROLE, USER_ROLE)
    if error:
        return error

    requested_user_id = request.args.get("user_id", type=int)

    if current_user["role"] == ADMIN_ROLE:
        user_id = requested_user_id
    else:
        user_id = current_user["id"]

    session = get_session()
    try:
        invoices = InvoiceRepository(session).list_invoices(user_id=user_id)
        response_body = [
            {
                "id": invoice.id,
                "user": {
                    "id": invoice.user.id,
                    "username": invoice.user.username,
                    "role": invoice.user.role,
                },
                "total": float(invoice.total),
                "created_at": invoice.created_at.isoformat(),
                "items": [
                    {
                        "id": item.id,
                        "product_id": item.product_id,
                        "product_name": item.product.name,
                        "quantity": item.quantity,
                        "unit_price": float(item.unit_price),
                        "subtotal": float(item.subtotal),
                    }
                    for item in invoice.items
                ],
            }
            for invoice in invoices
        ]
    finally:
        session.close()

    return jsonify(response_body), 200


@app.route("/invoices/<int:invoice_id>", methods=["GET"])
def get_invoice(invoice_id):
    current_user, error = require_auth(ADMIN_ROLE, USER_ROLE)
    if error:
        return error

    session = get_session()
    try:
        invoice = InvoiceRepository(session).get_by_id(invoice_id)
        if invoice is None:
            return json_error("Invoice not found", 404)

        if current_user["role"] != ADMIN_ROLE and invoice.user_id != current_user["id"]:
            return json_error("Forbidden", 403)

        response_body = {
            "id": invoice.id,
            "user": {
                "id": invoice.user.id,
                "username": invoice.user.username,
                "role": invoice.user.role,
            },
            "total": float(invoice.total),
            "created_at": invoice.created_at.isoformat(),
            "items": [
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "product_name": item.product.name,
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price),
                    "subtotal": float(item.subtotal),
                }
                for item in invoice.items
            ],
        }
    finally:
        session.close()

    return jsonify(response_body), 200


init_db()
bootstrap_admin()


if __name__ == "__main__":
    app.run(host="localhost", port=5000, debug=True)
