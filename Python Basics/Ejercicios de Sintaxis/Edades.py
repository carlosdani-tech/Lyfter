name = input("Escribe tu nombre: ")
last_name = input("Escribe tu apellido: ")
age = int(input("Ingresa tu edad: "))

if age <= 2:
    stage = "bebé"
elif age <= 11:
    stage = "niño"
elif age <= 14:
    stage = "preadolecente"
elif age <= 17:
    stage = "adolecente"
elif age <= 25:
    stage = "adulto joven"
elif age <= 65:
    stage = "adulto"
else:
    stage = "adulto mayor"

print("Hola", name, last_name)
print("Tienes", age, "años")
print("Eres un", stage)