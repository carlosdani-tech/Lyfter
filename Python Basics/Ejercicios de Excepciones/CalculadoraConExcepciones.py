current_number = 0

while True:
    print("\nCurrent number:", current_number)
    print("1. Add")
    print("2. Subtract")
    print("3. Multiply")
    print("4. Divide")
    print("5. Reset")
    print("6. Exit")

    option = input("Choose an option: ")

    if option not in ["1", "2", "3", "4", "5", "6"]:
        print("Invalid option. Try again.")
        continue

    if option == "6":
        print("Goodbye 👋")
        break

    if option == "5":
        current_number = 0
        print("Result reset to 0")
        continue

    try:
        number = float(input("Enter a number: "))
    except ValueError:
        print("Invalid number. Please enter a valid numeric value.")
        continue

    try:
        if option == "1":
            current_number = current_number + number

        elif option == "2":
            current_number = current_number - number

        elif option == "3":
            current_number = current_number * number

        elif option == "4":
            current_number = current_number / number

    except ZeroDivisionError:
        print("Error: Cannot divide by zero.")