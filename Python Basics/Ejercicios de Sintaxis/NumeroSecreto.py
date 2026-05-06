import random

secret_number = random.randint(1, 10)
user_number = 0

while user_number != secret_number:
    user_number = int(input("Adivina el número secreto del 1 al 10: "))

    if user_number < secret_number:
        print("El número secreto es más alto")
    elif user_number > secret_number:
        print("El número secreto es más bajo")
    else:
        print("Correcto! Adivinaste el número secreto")