class RentalRepository:
    def __init__(self, db_manager):
        self.db_manager = db_manager
        self.valid_statuses = ["Activo", "Finalizado", "Cancelado"]
        self.valid_filters = [
            "rental_id",
            "user_id",
            "car_id",
            "rental_date",
            "rental_status",
        ]

    def _format_rental(self, rental_record):
        return {
            "rental_id": rental_record[0],
            "user_id": rental_record[1],
            "car_id": rental_record[2],
            "rental_date": str(rental_record[3]),
            "rental_status": rental_record[4],
        }

    def create(self, user_id, car_id, rental_status="Activo"):
        connection = None
        cursor = None

        try:
            if rental_status not in self.valid_statuses:
                print("Invalid rental status")
                return False

            connection = self.db_manager.get_connection()
            cursor = connection.cursor()

            cursor.execute(
                "SELECT account_status FROM lyfter_car_rental.users WHERE user_id = %s;",
                (user_id,),
            )
            user_result = cursor.fetchone()

            if user_result is None:
                print("User not found")
                return False

            if user_result[0] != "Activo":
                print("User must be active")
                return False

            cursor.execute(
                "SELECT car_status FROM lyfter_car_rental.cars WHERE car_id = %s;",
                (car_id,),
            )
            car_result = cursor.fetchone()

            if car_result is None:
                print("Car not found")
                return False

            if car_result[0] != "Disponible":
                print("Car is not available")
                return False

            cursor.execute(
                """
                INSERT INTO lyfter_car_rental.rentals (user_id, car_id, rental_status)
                VALUES (%s, %s, %s);
                """,
                (user_id, car_id, rental_status),
            )

            if rental_status == "Activo":
                cursor.execute(
                    "UPDATE lyfter_car_rental.cars SET car_status = 'Alquilado' WHERE car_id = %s;",
                    (car_id,),
                )

            connection.commit()
            print("Rental inserted successfully")
            return True
        except Exception as error:
            if connection is not None:
                connection.rollback()
            raise
        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()

    def get_all(self, filters=None):
        query = """
            SELECT
                rental_id,
                user_id,
                car_id,
                rental_date,
                rental_status
            FROM lyfter_car_rental.rentals
        """
        params = []

        if filters is not None and len(filters) > 0:
            where_parts = []

            for key in filters:
                if key not in self.valid_filters:
                    print("Invalid filter field")
                    return False

                if key == "rental_status":
                    where_parts.append(key + " ILIKE %s")
                    params.append("%" + str(filters[key]) + "%")
                else:
                    where_parts.append(key + " = %s")
                    params.append(filters[key])

            query = query + " WHERE " + " AND ".join(where_parts)

        query = query + " ORDER BY rental_id;"

        results = self.db_manager.execute_query(query, tuple(params))
        formatted_results = [self._format_rental(result) for result in results]
        return formatted_results

    def get_by_id(self, rental_id):
        results = self.db_manager.execute_query(
            """
            SELECT
                rental_id,
                user_id,
                car_id,
                rental_date,
                rental_status
            FROM lyfter_car_rental.rentals
            WHERE rental_id = %s;
            """,
            (rental_id,),
        )

        if len(results) == 0:
            return False

        return self._format_rental(results[0])

    def complete_rental(self, rental_id):
        return self.update_status(rental_id, "Finalizado")

    def update_status(self, rental_id, rental_status):
        connection = None
        cursor = None

        try:
            if rental_status not in self.valid_statuses:
                print("Invalid rental status")
                return False

            connection = self.db_manager.get_connection()
            cursor = connection.cursor()

            cursor.execute(
                "SELECT car_id FROM lyfter_car_rental.rentals WHERE rental_id = %s;",
                (rental_id,),
            )
            rental_result = cursor.fetchone()

            if rental_result is None:
                print("Rental not found")
                return False

            car_id = rental_result[0]

            cursor.execute(
                "SELECT car_status FROM lyfter_car_rental.cars WHERE car_id = %s;",
                (car_id,),
            )
            car_result = cursor.fetchone()

            if car_result is None:
                print("Car not found")
                return False

            current_car_status = car_result[0]

            cursor.execute(
                "UPDATE lyfter_car_rental.rentals SET rental_status = %s WHERE rental_id = %s;",
                (rental_status, rental_id),
            )

            if rental_status == "Activo":
                cursor.execute(
                    "UPDATE lyfter_car_rental.cars SET car_status = 'Alquilado' WHERE car_id = %s;",
                    (car_id,),
                )
            elif current_car_status == "Alquilado":
                cursor.execute(
                    "UPDATE lyfter_car_rental.cars SET car_status = 'Disponible' WHERE car_id = %s;",
                    (car_id,),
                )

            connection.commit()
            print("Rental status updated successfully")
            return True
        except Exception as error:
            if connection is not None:
                connection.rollback()
            raise
        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()
