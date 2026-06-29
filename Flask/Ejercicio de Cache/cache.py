import redis


class CacheManager:
    def __init__(self, host, port, password, *args, **kwargs):
        self.redis_client = redis.Redis(
            host=host,
            port=port,
            password=password,
            *args,
            **kwargs,
        )
        connection_status = self.redis_client.ping()
        if connection_status:
            print("Connection created succesfully")

    def store_data(self, key, value, time_to_live=None):
        try:
            if time_to_live is None:
                self.redis_client.set(key, value)
                print(f"Key '{key}' created with value '{value}'.")
            else:
                self.redis_client.setex(key, time_to_live, value)
                print(
                    f"Key '{key}' created with value '{value}' and ttl {time_to_live}."
                )
        except redis.RedisError as error:
            print(f"An error ocurred while storing data in Redis: {error}")

    def check_key(self, key):
        try:
            key_exists = self.redis_client.exists(key)
            if key_exists:
                print(f"Key '{key}' exists in Redis.")
                ttl = self.redis_client.ttl(key)
                if ttl:
                    print(f"Key '{key}' has a TTL of {ttl}.")

                return True, ttl

            print(f"Key '{key}' does not exist in Redis.")
            return False, None
        except redis.RedisError as error:
            print(f"An error ocurred while checking a key in Redis: {error}")
            return False, None

    def get_data(self, key):
        try:
            output = self.redis_client.get(key)
            if output is not None:
                result = output.decode("utf-8")
                print(f"Value '{result}' found for key '{key}'.")
                return result
            else:
                print(f"No value found for key {key}.")
                return None
        except redis.RedisError as error:
            print(f"An error ocurred while retrieving data from Redis: {error}")

    def delete_data(self, key):
        try:
            output = self.redis_client.delete(key)
            if output > 0:
                print(f"Key '{key}' and its value have been deleted.")
            else:
                print(f"Key '{key}' not found.")

            return output == 1
        except redis.RedisError as error:
            print(f"An error ocurred while deleting data from Redis: {error}")
            return False

    def delete_data_with_pattern(self, pattern):
        try:
            # Iterar sobre las claves que coinciden con el patrón
            for key in self.redis_client.scan_iter(match=pattern):
                self.delete_data(key)
        except redis.RedisError as error:
            print(f"An error ocurred while deleting data from Redis: {error}")	