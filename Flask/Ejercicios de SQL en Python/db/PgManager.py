import psycopg2


class PgManager:
    def __init__(self, db_name, user, password, host, port=5432):
        self.db_name = db_name
        self.user = user
        self.password = password
        self.host = host
        self.port = port

    def get_connection(self):
        return psycopg2.connect(
            dbname=self.db_name,
            user=self.user,
            password=self.password,
            host=self.host,
            port=self.port,
        )

    def execute_query(self, query, params=None):
        connection = None
        cursor = None

        try:
            connection = self.get_connection()
            cursor = connection.cursor()

            if params is None:
                params = ()

            cursor.execute(query, params)
            connection.commit()

            if cursor.description:
                return cursor.fetchall()

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
