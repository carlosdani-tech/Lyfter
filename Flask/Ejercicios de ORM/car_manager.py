from models import Car, User


class CarManager:

    def __init__(self, session):
        self.session = session

    def create_car(self, brand, model, manufacture_year, car_status, user_id=None):
        new_car = Car(
            brand=brand,
            model=model,
            manufacture_year=manufacture_year,
            car_status=car_status,
            user_id=user_id
        )

        self.session.add(new_car)
        self.session.commit()
        self.session.refresh(new_car)

        return new_car

    def update_car(self, car_id, brand=None, model=None, manufacture_year=None, car_status=None):
        car = self.session.query(Car).filter_by(car_id=car_id).first()

        if not car:
            return None

        if brand:
            car.brand = brand

        if model:
            car.model = model

        if manufacture_year:
            car.manufacture_year = manufacture_year

        if car_status:
            car.car_status = car_status

        self.session.commit()
        self.session.refresh(car)

        return car

    def delete_car(self, car_id):
        car = self.session.query(Car).filter_by(car_id=car_id).first()

        if not car:
            return False

        self.session.delete(car)
        self.session.commit()

        return True

    def assign_car_to_user(self, car_id, user_id):
        car = self.session.query(Car).filter_by(car_id=car_id).first()
        user = self.session.query(User).filter_by(user_id=user_id).first()

        if not car or not user:
            return None

        car.user_id = user.user_id

        self.session.commit()
        self.session.refresh(car)

        return car

    def get_all_cars(self):
        return self.session.query(Car).all()

    def get_car_by_id(self, car_id):
        return self.session.query(Car).filter_by(car_id=car_id).first()