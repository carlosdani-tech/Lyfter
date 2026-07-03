from app import create_app
from app.extensions import db


def test_database_models_are_registered():
    create_app()

    expected_tables = {
        "roles",
        "users",
        "products",
        "carts",
        "cart_items",
        "sales",
        "sale_items",
        "invoices",
    }

    assert expected_tables.issubset(db.metadata.tables.keys())