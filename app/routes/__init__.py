from app.routes.auth import auth_bp
from app.routes.cart import cart_bp
from app.routes.invoices import invoices_bp
from app.routes.products import products_bp
from app.routes.sales import sales_bp
from app.routes.users import users_bp
from flask import Flask


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(auth_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(cart_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(invoices_bp)
