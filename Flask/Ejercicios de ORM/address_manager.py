from models import Address, User


class AddressManager:

    def __init__(self, session):
        self.session = session

    def create_address(self, province, canton, district, exact_address, user_id):
        user = self.session.query(User).filter_by(user_id=user_id).first()

        if not user:
            return None

        new_address = Address(
            province=province,
            canton=canton,
            district=district,
            exact_address=exact_address,
            user_id=user_id
        )

        self.session.add(new_address)
        self.session.commit()
        self.session.refresh(new_address)

        return new_address

    def update_address(self, address_id, province=None, canton=None, district=None, exact_address=None):
        address = self.session.query(Address).filter_by(address_id=address_id).first()

        if not address:
            return None

        if province:
            address.province = province

        if canton:
            address.canton = canton

        if district:
            address.district = district

        if exact_address:
            address.exact_address = exact_address

        self.session.commit()
        self.session.refresh(address)

        return address

    def delete_address(self, address_id):
        address = self.session.query(Address).filter_by(address_id=address_id).first()

        if not address:
            return False

        self.session.delete(address)
        self.session.commit()

        return True

    def get_all_addresses(self):
        return self.session.query(Address).all()

    def get_address_by_id(self, address_id):
        return self.session.query(Address).filter_by(address_id=address_id).first()