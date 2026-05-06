number1 = float(input("Ingrese el primer número: "))
number2 = float(input("Ingrese el segundo número: "))
number3 = float(input("Ingrese el tercer número: "))

if number1 >= number2 and number1 >= number3:
    biggest = number1
elif number2 >= number1 and number2 >= number3:
    biggest = number2
else:
    biggest = number3

print ("El número mayor es:", int (biggest))