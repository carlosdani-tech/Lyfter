from decimal import Decimal

from app.extensions import db
from app.repositories.product_repository import ProductRepository
from app.utils.cache import build_cache_key, delete_key, delete_pattern, get_json, set_json


class ProductError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def serialize_product(product) -> dict:
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "price": str(product.price.quantize(Decimal("0.01"))),
        "stock": product.stock,
        "image_url": product.image_url,
        "is_active": product.is_active,
        "created_at": product.created_at.isoformat() if product.created_at else None,
        "updated_at": product.updated_at.isoformat() if product.updated_at else None,
    }


class ProductService:
    @staticmethod
    def _list_cache_key() -> str:
        return build_cache_key("products", "list")

    @staticmethod
    def _detail_cache_key(product_id: int) -> str:
        return build_cache_key("products", "detail", product_id)

    @staticmethod
    def invalidate_product_cache(product_id: int | None = None) -> None:
        delete_key(ProductService._list_cache_key())
        if product_id is None:
            delete_pattern(build_cache_key("products", "detail", "*"))
            return

        delete_key(ProductService._detail_cache_key(product_id))

    @staticmethod
    def create_product(payload: dict) -> dict:
        product = ProductRepository.create(**payload)
        db.session.commit()
        ProductService.invalidate_product_cache(product.id)
        return {"product": serialize_product(product)}

    @staticmethod
    def list_products() -> dict:
        cache_key = ProductService._list_cache_key()
        cached_data = get_json(cache_key)
        if cached_data is not None:
            return cached_data

        products = ProductRepository.list_active()
        data = {"products": [serialize_product(product) for product in products]}
        set_json(cache_key, data)
        return data

    @staticmethod
    def get_product(product_id: int) -> dict:
        cache_key = ProductService._detail_cache_key(product_id)
        cached_data = get_json(cache_key)
        if cached_data is not None:
            return cached_data

        product = ProductRepository.get_by_id(product_id)
        if not product or not product.is_active:
            raise ProductError("Product not found.", 404)

        data = {"product": serialize_product(product)}
        set_json(cache_key, data)
        return data

    @staticmethod
    def update_product(product_id: int, payload: dict) -> dict:
        product = ProductRepository.get_by_id(product_id)
        if not product:
            raise ProductError("Product not found.", 404)

        updated_product = ProductRepository.update(product, **payload)
        db.session.commit()
        ProductService.invalidate_product_cache(product_id)
        return {"product": serialize_product(updated_product)}

    @staticmethod
    def deactivate_product(product_id: int) -> dict:
        product = ProductRepository.get_by_id(product_id)
        if not product:
            raise ProductError("Product not found.", 404)

        deactivated_product = ProductRepository.deactivate(product)
        db.session.commit()
        ProductService.invalidate_product_cache(product_id)
        return {"product": serialize_product(deactivated_product)}
