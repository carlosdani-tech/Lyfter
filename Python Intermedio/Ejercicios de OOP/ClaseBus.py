class Person:

    def __init__(self, name):
        self.name = name


class Bus:

    def __init__(self, max_passengers):
        self.max_passengers = max_passengers
        self.passengers = []


    def add_passenger(self, person):

        if len(self.passengers) < self.max_passengers:

            self.passengers.append(person)

            print(person.name, "got on the bus")

        else:
            print("The bus is full")


    def remove_passenger(self):

        if len(self.passengers) > 0:

            removed_person = self.passengers.pop()

            print(removed_person.name, "got off the bus")

        else:
            print("There are no passengers")


    def show_passengers(self):

        print("\nCurrent passengers:")

        for passenger in self.passengers:
            print("-", passenger.name)


# Crear personas
person1 = Person("Carlos")
person2 = Person("Ana")
person3 = Person("Luis")

# Crear bus
bus = Bus(2)

# Agregar pasajeros
bus.add_passenger(person1)
bus.add_passenger(person2)

# Intentar agregar otro
bus.add_passenger(person3)

# Mostrar pasajeros
bus.show_passengers()

# Bajar pasajero
bus.remove_passenger()

# Mostrar pasajeros nuevamente
bus.show_passengers()