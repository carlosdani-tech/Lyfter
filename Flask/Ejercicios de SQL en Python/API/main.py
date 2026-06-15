import os
import sys

from flask import Flask, jsonify, request


project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.append(project_root)

from API.CarRepository import CarRepository
from API.RentalRepository import RentalRepository
from API.UserRepository import UserRepository
from db.PgManager import PgManager


app = Flask(__name__)

db_manager = PgManager(
    db_name=os.getenv("DB_NAME", "postgres"),
    user=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD", "Carlosgp"),
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "5432")),
)


def has_required_fields(data, required_fields):
    if data is None:
        return False

    for field in required_fields:
        if field not in data:
            return False

    return True


def internal_server_error(error):
    print("Internal server error:", error)
    return jsonify({"error": "Internal server error"}), 500


@app.route("/users", methods=["POST"])
def create_user():
    try:
        users_repo = UserRepository(db_manager)
        data = request.get_json()

        if has_required_fields(data, ["full_name", "email", "username", "password", "birth_date"]) is False:
            return jsonify({"error": "Missing required fields"}), 400

        created = users_repo.create(
            data["full_name"],
            data["email"],
            data["username"],
            data["password"],
            data["birth_date"],
            data.get("account_status", "Activo"),
        )

        if created is False:
            return jsonify({"error": "Could not create user"}), 400

        return jsonify({"message": "User created successfully"}), 201
    except Exception as error:
        return internal_server_error(error)


@app.route("/cars", methods=["POST"])
def create_car():
    try:
        cars_repo = CarRepository(db_manager)
        data = request.get_json()

        if has_required_fields(data, ["brand", "model", "manufacture_year"]) is False:
            return jsonify({"error": "Missing required fields"}), 400

        created = cars_repo.create(
            data["brand"],
            data["model"],
            data["manufacture_year"],
            data.get("car_status", "Disponible"),
        )

        if created is False:
            return jsonify({"error": "Could not create car"}), 400

        return jsonify({"message": "Car created successfully"}), 201
    except Exception as error:
        return internal_server_error(error)


@app.route("/rentals", methods=["POST"])
def create_rental():
    try:
        rentals_repo = RentalRepository(db_manager)
        data = request.get_json()

        if has_required_fields(data, ["user_id", "car_id"]) is False:
            return jsonify({"error": "Missing required fields"}), 400

        created = rentals_repo.create(
            data["user_id"],
            data["car_id"],
            data.get("rental_status", "Activo"),
        )

        if created is False:
            return jsonify({"error": "Could not create rental"}), 400

        return jsonify({"message": "Rental created successfully"}), 201
    except Exception as error:
        return internal_server_error(error)


@app.route("/users/<int:user_id>/status", methods=["PATCH"])
def update_user_status(user_id):
    try:
        users_repo = UserRepository(db_manager)
        data = request.get_json()

        if data is None or "account_status" not in data:
            return jsonify({"error": "account_status is required"}), 400

        user = users_repo.get_by_id(user_id)
        if user is False:
            return jsonify({"error": "User not found"}), 404

        updated = users_repo.update_status(user_id, data["account_status"])
        if updated is False:
            return jsonify({"error": "Could not update user status"}), 400

        return jsonify({"message": "User status updated successfully"}), 200
    except Exception as error:
        return internal_server_error(error)


@app.route("/users/<int:user_id>/moroso", methods=["PATCH"])
def update_user_moroso(user_id):
    try:
        users_repo = UserRepository(db_manager)
        data = request.get_json()

        if data is None or "is_moroso" not in data:
            return jsonify({"error": "is_moroso is required"}), 400

        user = users_repo.get_by_id(user_id)
        if user is False:
            return jsonify({"error": "User not found"}), 404

        updated = users_repo.update_moroso(user_id, data["is_moroso"], user["account_status"])
        if updated is False:
            return jsonify({"error": "Could not update user moroso flag"}), 400

        return jsonify({"message": "User moroso flag updated successfully"}), 200
    except Exception as error:
        return internal_server_error(error)


@app.route("/cars/<int:car_id>/status", methods=["PATCH"])
def update_car_status(car_id):
    try:
        cars_repo = CarRepository(db_manager)
        data = request.get_json()

        if data is None or "car_status" not in data:
            return jsonify({"error": "car_status is required"}), 400

        car = cars_repo.get_by_id(car_id)
        if car is False:
            return jsonify({"error": "Car not found"}), 404

        updated = cars_repo.update_status(car_id, data["car_status"])
        if updated is False:
            return jsonify({"error": "Could not update car status"}), 400

        return jsonify({"message": "Car status updated successfully"}), 200
    except Exception as error:
        return internal_server_error(error)


@app.route("/rentals/<int:rental_id>/complete", methods=["PATCH"])
def complete_rental(rental_id):
    try:
        rentals_repo = RentalRepository(db_manager)

        rental = rentals_repo.get_by_id(rental_id)
        if rental is False:
            return jsonify({"error": "Rental not found"}), 404

        completed = rentals_repo.complete_rental(rental_id)
        if completed is False:
            return jsonify({"error": "Could not complete rental"}), 400

        return jsonify({"message": "Rental completed successfully"}), 200
    except Exception as error:
        return internal_server_error(error)


@app.route("/rentals/<int:rental_id>/status", methods=["PATCH"])
def update_rental_status(rental_id):
    try:
        rentals_repo = RentalRepository(db_manager)
        data = request.get_json()

        if data is None or "rental_status" not in data:
            return jsonify({"error": "rental_status is required"}), 400

        rental = rentals_repo.get_by_id(rental_id)
        if rental is False:
            return jsonify({"error": "Rental not found"}), 404

        updated = rentals_repo.update_status(rental_id, data["rental_status"])
        if updated is False:
            return jsonify({"error": "Could not update rental status"}), 400

        return jsonify({"message": "Rental status updated successfully"}), 200
    except Exception as error:
        return internal_server_error(error)


@app.route("/users", methods=["GET"])
def list_users():
    try:
        users_repo = UserRepository(db_manager)
        users = users_repo.get_all(request.args.to_dict())

        if users is False:
            return jsonify({"error": "Could not get users"}), 400

        return jsonify(users), 200
    except Exception as error:
        return internal_server_error(error)


@app.route("/cars", methods=["GET"])
def list_cars():
    try:
        cars_repo = CarRepository(db_manager)
        cars = cars_repo.get_all(request.args.to_dict())

        if cars is False:
            return jsonify({"error": "Could not get cars"}), 400

        return jsonify(cars), 200
    except Exception as error:
        return internal_server_error(error)


@app.route("/rentals", methods=["GET"])
def list_rentals():
    try:
        rentals_repo = RentalRepository(db_manager)
        rentals = rentals_repo.get_all(request.args.to_dict())

        if rentals is False:
            return jsonify({"error": "Could not get rentals"}), 400

        return jsonify(rentals), 200
    except Exception as error:
        return internal_server_error(error)


if __name__ == "__main__":
    app.run(debug=True)
