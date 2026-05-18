from datetime import date


class User:

    def __init__(self, name, date_of_birth):
        self.name = name
        self.date_of_birth = date_of_birth


    @property
    def age(self):

        today = date.today()

        age = today.year - self.date_of_birth.year

        # Revisar si todavía no ha cumplido años
        if (
            today.month,
            today.day
        ) < (
            self.date_of_birth.month,
            self.date_of_birth.day
        ):
            age = age - 1

        return age


def validate_adult(function):

    def wrapper(user, *args, **kwargs):

        if user.age < 18:
            raise ValueError(
                user.name + " is under age"
            )

        return function(user, *args, **kwargs)

    return wrapper


@validate_adult
def enter_casino(user):
    print(user.name, "can enter the casino")


adult_user = User(
    "Carlos",
    date(2000, 5, 10)
)

minor_user = User(
    "Luis",
    date(2010, 8, 15)
)


enter_casino(adult_user)

# Esto lanzaría excepción
# enter_casino(minor_user)