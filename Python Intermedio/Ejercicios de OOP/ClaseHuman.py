class Head:

    def __init__(self, eyes, mouth):
        self.eyes = eyes
        self.mouth = mouth


class Hand:

    def __init__(self, fingers):
        self.fingers = fingers


class Arm:

    def __init__(self, hand):
        self.hand = hand


class Feet:

    def __init__(self, toes):
        self.toes = toes


class Leg:

    def __init__(self, feet):
        self.feet = feet


class Torso:

    def __init__(self, head, right_arm, left_arm, right_leg, left_leg):
        self.head = head
        self.right_arm = right_arm
        self.left_arm = left_arm
        self.right_leg = right_leg
        self.left_leg = left_leg


class Human:

    def __init__(self, name, torso):
        self.name = name
        self.torso = torso


# Crear manos
right_hand = Hand(5)
left_hand = Hand(5)

# Crear brazos
right_arm = Arm(right_hand)
left_arm = Arm(left_hand)

# Crear pies
right_feet = Feet(5)
left_feet = Feet(5)

# Crear piernas
right_leg = Leg(right_feet)
left_leg = Leg(left_feet)

# Crear cabeza
head = Head(2, 1)

# Crear torso
torso = Torso(
    head,
    right_arm,
    left_arm,
    right_leg,
    left_leg
)

# Crear humano
human = Human("Carlos", torso)


# Mostrar información
print("Human:", human.name)

print("Eyes:", human.torso.head.eyes)

print("Right hand fingers:",
      human.torso.right_arm.hand.fingers)

print("Left hand fingers:",
      human.torso.left_arm.hand.fingers)

print("Right foot toes:",
      human.torso.right_leg.feet.toes)

print("Left foot toes:",
      human.torso.left_leg.feet.toes)