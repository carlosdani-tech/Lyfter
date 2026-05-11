amount = int(input("Ingrese la cantidad de notas: "))

approved_count = 0
failed_count = 0

total_sum = 0
approved_sum = 0
failed_sum = 0

for i in range(amount):
    grade = float(input("Ingrese la nota: "))

    total_sum = total_sum + grade

    if grade >= 70:
        approved_count = approved_count + 1
        approved_sum = approved_sum + grade
    else:
        failed_count = failed_count + 1
        failed_sum = failed_sum + grade

general_average = total_sum / amount

if approved_count > 0:
    approved_average = approved_sum / approved_count
else:
    approved_average = 0

if failed_count > 0:
    failed_average = failed_sum / failed_count
else:
    failed_average = 0

print("Notas aprobadas:", approved_count)
print("Notas desaprobadas:", failed_count)
print("Promedio general:", general_average)
print("Promedio de aprobadas:", approved_average)
print("Promedio de desaprobadas:", failed_average)