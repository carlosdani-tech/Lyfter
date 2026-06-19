from sqlalchemy.exc import IntegrityError

from database import Base, engine, SessionLocal
from user_manager import UserManager
from car_manager import CarManager
from address_manager import AddressManager


def create_tables():
    Base.metadata.create_all(bind=engine)
    print("Tables validated or created successfully.")


def show_users(users):
    print("\nUSERS:")
    for user in users:
        print(
            f"ID: {user.user_id} | "
            f"Name: {user.full_name} | "
            f"Email: {user.email} | "
            f"Username: {user.username}"
        )


def show_cars(cars):
    print("\nCARS:")
    for car in cars:
        owner = car.user.full_name if car.user else "Sin usuario asociado"

        print(
            f"ID: {car.car_id} | "
            f"Brand: {car.brand} | "
            f"Model: {car.model} | "
            f"Year: {car.manufacture_year} | "
            f"Status: {car.car_status} | "
            f"Owner: {owner}"
        )


def show_addresses(addresses):
    print("\nADDRESSES:")
    for address in addresses:
        print(
            f"ID: {address.address_id} | "
            f"Province: {address.province} | "
            f"Canton: {address.canton} | "
            f"District: {address.district} | "
            f"Exact Address: {address.exact_address} | "
            f"User: {address.user.full_name}"
        )


def main():
    create_tables()

    session = SessionLocal()

    user_manager = UserManager(session)
    car_manager = CarManager(session)
    address_manager = AddressManager(session)

    try:
        # Crear usuarios
        user1 = user_manager.create_user(
            full_name="Carlos Gutiérrez",
            email="carlos.gutierrez@example.com",
            username="carlosg"
        )

        user2 = user_manager.create_user(
            full_name="María Fernández",
            email="maria.fernandez@example.com",
            username="mariaf"
        )

        # Modificar usuario
        user_manager.update_user(
            user_id=user1.user_id,
            full_name="Carlos Daniel Gutiérrez"
        )

        # Crear automóviles
        car1 = car_manager.create_car(
            brand="Toyota",
            model="Corolla",
            manufacture_year=2020,
            car_status="Disponible"
        )

        car2 = car_manager.create_car(
            brand="Hyundai",
            model="Accent",
            manufacture_year=2017,
            car_status="Disponible"
        )

        # Crear automóvil asociado directamente a usuario
        car3 = car_manager.create_car(
            brand="Nissan",
            model="Sentra",
            manufacture_year=2021,
            car_status="Alquilado",
            user_id=user2.user_id
        )

        # Asociar automóvil a usuario
        car_manager.assign_car_to_user(
            car_id=car1.car_id,
            user_id=user1.user_id
        )

        # Crear direcciones
        address_manager.create_address(
            province="San José",
            canton="Aserrí",
            district="Aserrí",
            exact_address="Del parque central 300 metros al sur",
            user_id=user1.user_id
        )

        address_manager.create_address(
            province="Heredia",
            canton="San Rafael",
            district="San Rafael",
            exact_address="Frente a la iglesia principal",
            user_id=user2.user_id
        )

        # Modificar automóvil
        car_manager.update_car(
            car_id=car2.car_id,
            car_status="Mantenimiento"
        )

        # Modificar dirección
        address_manager.update_address(
            address_id=1,
            exact_address="Del parque central 500 metros al este"
        )

        # Consultar registros
        users = user_manager.get_all_users()
        cars = car_manager.get_all_cars()
        addresses = address_manager.get_all_addresses()

        show_users(users)
        show_cars(cars)
        show_addresses(addresses)

    except IntegrityError as error:
        session.rollback()
        print("Database integrity error.")
        print("Possible duplicated email or username.")
        print(error)

    except Exception as error:
        session.rollback()
        print("Unexpected error.")
        print(error)

    finally:
        session.close()


if __name__ == "__main__":
    main()