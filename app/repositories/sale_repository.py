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
        return db.session.get(Sale, sale_id)

    @staticmethod
    def list_by_user_id(user_id: int) -> list[Sale]:
        return (
            db.session.query(Sale)
            .filter(Sale.user_id == user_id)
            .order_by(Sale.created_at.desc())
            .all()
        )

    @staticmethod
    def list_all() -> list[Sale]:
        return db.session.query(Sale).order_by(Sale.created_at.desc()).all()

    @staticmethod
    def update_status(sale: Sale, status: str, **timestamps) -> Sale:
        sale.status = status
        for field, value in timestamps.items():
            setattr(sale, field, value)

        db.session.flush()
        return sale
