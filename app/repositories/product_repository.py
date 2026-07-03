from app.extensions import db
from app.models import Product


class ProductRepository:
    @staticmethod
    def create(**product_data) -> Product:
        product = Product(**product_data)
        db.session.add(product)
        db.session.flush()
        return product

    @staticmethod
    def list_active() -> list[Product]:
        return (
            db.session.query(Product)
            .filter(Product.is_active.is_(True))
            .order_by(Product.name.asc())
            .all()
        )

    @staticmethod
    def get_by_id(product_id: int) -> Product | None:
        return db.session.get(Product, product_id)

    @staticmethod
    def update(product: Product, **product_data) -> Product:
        for field, value in product_data.items():
            setattr(product, field, value)

        db.session.flush()
        return product

    @staticmethod
    def deactivate(product: Product) -> Product:
        product.is_active = False
        db.session.flush()
        return product

    @staticmethod
    def reduce_stock(product: Product, quantity: int) -> Product:
        product.stock -= quantity
        db.session.flush()
        return product

    @staticmethod
    def restore_stock(product: Product, quantity: int) -> Product:
        product.stock += quantity
        db.session.flush()
        return product
