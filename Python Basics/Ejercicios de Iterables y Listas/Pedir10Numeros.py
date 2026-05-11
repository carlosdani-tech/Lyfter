numbers = []

for i in range(10):
    num = int(input("Ingresa un número: "))
    numbers.append(num)

max_number = numbers[0]

for i in range(len(numbers)):
    if numbers[i] > max_number:
        max_number = numbers[i]

print("Números ingresados:", numbers)
print("El número mayor es:", max_number)