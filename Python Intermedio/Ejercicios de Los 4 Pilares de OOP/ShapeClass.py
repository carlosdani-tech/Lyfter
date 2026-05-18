from abc import ABC, abstractmethod
import math


class Shape(ABC):

    @abstractmethod
    def calculate_area(self):
        pass


    @abstractmethod
    def calculate_perimeter(self):
        pass


class Circle(Shape):

    def __init__(self, radius):
        self.radius = radius


    def calculate_area(self):
        return math.pi * (self.radius ** 2)


    def calculate_perimeter(self):
        return 2 * math.pi * self.radius


class Square(Shape):

    def __init__(self, side):
        self.side = side


    def calculate_area(self):
        return self.side * self.side


    def calculate_perimeter(self):
        return self.side * 4


class Rectangle(Shape):

    def __init__(self, width, height):
        self.width = width
        self.height = height


    def calculate_area(self):
        return self.width * self.height


    def calculate_perimeter(self):
        return 2 * (self.width + self.height)


circle = Circle(5)
square = Square(4)
rectangle = Rectangle(6, 3)

print("Circle area:", circle.calculate_area())
print("Circle perimeter:", circle.calculate_perimeter())

print("Square area:", square.calculate_area())
print("Square perimeter:", square.calculate_perimeter())

print("Rectangle area:", rectangle.calculate_area())
print("Rectangle perimeter:", rectangle.calculate_perimeter())