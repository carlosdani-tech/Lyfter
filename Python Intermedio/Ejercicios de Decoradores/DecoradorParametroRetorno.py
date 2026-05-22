def print_information(function):

    def wrapper(*args, **kwargs):

        print("Arguments:", args)
        print("Keyword arguments:", kwargs)

        result = function(*args, **kwargs)

        print("Return value:", result)

        return result

    return wrapper


@print_information
def add(a, b):
    return a + b


result = add(5, 3)