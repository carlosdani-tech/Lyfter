class CarRepository:
    def __init__(self, db_manager):
        self.db_manager = db_manager
        self.valid_statuses = ["Disponible", "Alquilado", "Mantenimiento", "Inactivo"]
        self.valid_filters = [
            "car_id",
            "brand",
            "model",
            "manufacture_year",
            "car_status",
        ]

    def _format_car(self, car_record):
        return {
            "car_id": car_record[0],
            "brand": car_record[1],
            "model": car_record[2],
            "manufacture_year": car_record[3],
            "car_status": car_record[4],
        }

    def create(self, brand, model, manufacture_year, car_status="Disponible"):
        if car_status not in self.valid_statuses:
            print("Invalid car status")
            return False

        self.db_manager.execute_query(
            """
            INSERT INTO lyfter_car_rental.cars (
                brand,
                model,
                manufacture_year,
                car_status
            )
            VALUES (%s, %s, %s, %s);
            """,
            (brand, model, manufacture_year, car_status),
        )
        print("Car inserted successfully")
        return True

    def get_all(self, filters=None):
        query = """
            SELECT
                car_id,
                brand,
                model,
                manufacture_year,
                car_status
            FROM lyfter_car_rental.cars
        """
        params = []

        if filters is not None and len(filters) > 0:
            where_parts = []

            for key in filters:
                if key not in self.valid_filters:
                    print("Invalid filter field")
                    return False

                if key == "brand" or key == "model" or key == "car_status":
                    where_parts.append(key + " ILIKE %s")
                    params.append("%" + str(filters[key]) + "%")
                else:
                    where_parts.append(key + " = %s")
                    params.append(filters[key])

            query = query + " WHERE " + " AND ".join(where_parts)

        query = query + " ORDER BY car_id;"

        results = self.db_manager.execute_query(query, tuple(params))
        formatted_results = [self._format_car(result) for result in results]
        return formatted_results

    def get_by_id(self, car_id):
        results = self.db_manager.execute_query(
            """
            SELECT
                car_id,
                brand,
                model,
                manufacture_year,
                car_status
            FROM lyfter_car_rental.cars
            WHERE car_id = %s;
            """,
            (car_id,),
        )

        if len(results) == 0:
            return False

        return self._format_car(results[0])

    def update_status(self, car_id, car_status):
        if car_status not in self.valid_statuses:
            print("Invalid car status")
            return False

        self.db_manager.execute_query(
            "UPDATE lyfter_car_rental.cars SET car_status = %s WHERE car_id = %s;",
            (car_status, car_id),
        )
        print("Car status updated successfully")
        return True
