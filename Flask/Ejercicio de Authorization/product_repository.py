from models import Product


class ProductRepository:
    def __init__(self, session):
        self.session = session

    def list_all(self):
        return self.session.query(Product).order_by(Product.id.asc()).all()

    def get_by_id(self, product_id):
        return self.session.get(Product, product_id)

    def create(self, **product_data):
        product = Product(**product_data)
        self.session.add(product)
        self.session.flush()
        return product

    def update(self, product):
        self.session.flush()
        return product

    def delete(self, product):
        self.session.delete(product)
        self.session.flush()
