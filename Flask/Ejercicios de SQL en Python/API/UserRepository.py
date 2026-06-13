class UserRepository:
    def __init__(self, db_manager):
        self.db_manager = db_manager
        self.valid_statuses = ["Activo", "Inactivo", "Suspendido"]
        self.valid_filters = [
            "user_id",
            "full_name",
            "email",
            "username",
            "password",
            "birth_date",
            "account_status",
        ]

    def _format_user(self, user_record):
        return {
            "user_id": user_record[0],
            "full_name": user_record[1],
            "email": user_record[2],
            "username": user_record[3],
            "birth_date": str(user_record[4]),
            "account_status": user_record[5],
        }

    def create(self, full_name, email, username, password, birth_date, account_status="Activo"):
        if account_status not in self.valid_statuses:
            print("Invalid user status")
            return False

        self.db_manager.execute_query(
            """
            INSERT INTO lyfter_car_rental.users (
                full_name,
                email,
                username,
                password,
                birth_date,
                account_status
            )
            VALUES (%s, %s, %s, %s, %s, %s);
            """,
            (full_name, email, username, password, birth_date, account_status),
        )
        print("User inserted successfully")
        return True

    def get_all(self, filters=None):
        query = """
            SELECT
                user_id,
                full_name,
                email,
                username,
                birth_date,
                account_status
            FROM lyfter_car_rental.users
        """
        params = []

        if filters is not None and len(filters) > 0:
            where_parts = []

            for key in filters:
                if key not in self.valid_filters:
                    print("Invalid filter field")
                    return False

                if key == "full_name" or key == "email" or key == "username" or key == "account_status":
                    where_parts.append(key + " ILIKE %s")
                    params.append("%" + str(filters[key]) + "%")
                else:
                    where_parts.append(key + " = %s")
                    params.append(filters[key])

            query = query + " WHERE " + " AND ".join(where_parts)

        query = query + " ORDER BY user_id;"

        results = self.db_manager.execute_query(query, tuple(params))
        formatted_results = [self._format_user(result) for result in results]
        return formatted_results

    def get_by_id(self, user_id):
        results = self.db_manager.execute_query(
            """
            SELECT
                user_id,
                full_name,
                email,
                username,
                birth_date,
                account_status
            FROM lyfter_car_rental.users
            WHERE user_id = %s;
            """,
            (user_id,),
        )

        if len(results) == 0:
            return False

        return self._format_user(results[0])

    def update_status(self, user_id, account_status):
        if account_status not in self.valid_statuses:
            print("Invalid user status")
            return False

        self.db_manager.execute_query(
            "UPDATE lyfter_car_rental.users SET account_status = %s WHERE user_id = %s;",
            (account_status, user_id),
        )
        print("User status updated successfully")
        return True

    def update_moroso(self, user_id, is_moroso, current_status):
        is_moroso = self._parse_boolean(is_moroso)
        if is_moroso is None:
            print("Invalid moroso value")
            return False

        new_status = current_status

        if is_moroso is True:
            new_status = "Suspendido"
        elif current_status == "Suspendido":
            new_status = "Activo"

        self.db_manager.execute_query(
            "UPDATE lyfter_car_rental.users SET account_status = %s WHERE user_id = %s;",
            (new_status, user_id),
        )
        print("User moroso status updated successfully")
        return True

    def _parse_boolean(self, value):
        if value is True or str(value).lower() == "true" or str(value) == "1":
            return True

        if value is False or str(value).lower() == "false" or str(value) == "0":
            return False

        return None
