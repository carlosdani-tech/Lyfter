class Flyer:

    def fly(self):
        print("This animal can fly")


class Swimmer:

    def swim(self):
        print("This animal can swim")


class Duck(Flyer, Swimmer):

    def make_sound(self):
        print("Quack quack")


duck = Duck()

duck.fly()
duck.swim()
duck.make_sound()