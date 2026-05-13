import math

class Circle:

    def __init__(self, radius):
        self.radius = radius


    def get_area(self):
        area = math.pi * (self.radius ** 2)

        return area


# Crear objeto
my_circle = Circle(5)

# Mostrar área
print("Radius:", my_circle.radius)
print("Area:", my_circle.get_area())