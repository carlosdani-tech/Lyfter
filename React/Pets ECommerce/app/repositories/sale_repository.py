from app.extensions import db
from app.models import Sale, SaleItem


class SaleRepository:
    @staticmethod
    def create(**sale_data) -> Sale:
        sale = Sale(**sale_data)
        db.session.add(sale)
        db.session.flush()
        return sale

    @staticmethod
    def add_item(**sale_item_data) -> SaleItem:
        sale_item = SaleItem(**sale_item_data)
        db.session.add(sale_item)
        db.session.flush()
        return sale_item

    @staticmethod
    def get_by_id(sale_id: int) -> Sale | None:
        return (
            db.session.query(Sale).filter(Sale.id == sale_id)
            .populate_existing().with_for_update().one_or_none()
        )

    @staticmethod
    def get_by_checkout_key(user_id: int, key: str) -> Sale | None:
        return (
            db.session.query(Sale).filter(Sale.user_id == user_id, Sale.idempotency_key == key)
            .populate_existing().with_for_update().one_or_none()
        )

    @staticmethod
    def update_status(sale: Sale, status: str, **timestamps) -> Sale:
        sale.status = status
        for field, value in timestamps.items():
            setattr(sale, field, value)

        db.session.flush()
        return sale
