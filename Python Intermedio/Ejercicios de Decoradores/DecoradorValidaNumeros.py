def validate_numbers(function):

    def wrapper(*args, **kwargs):

        # Revisar argumentos normales
        for argument in args:

            if not isinstance(argument, (int, float)):
                raise TypeError("All arguments must be numbers")

        # Revisar argumentos con nombre
        for key in kwargs:

            if not isinstance(kwargs[key], (int, float)):
                raise TypeError("All arguments must be numbers")

        return function(*args, **kwargs)

    return wrapper


@validate_numbers
def multiply(a, b):
    return a * b


print(multiply(5, 2))

# Esto daría error
# print(multiply(5, "hello"))