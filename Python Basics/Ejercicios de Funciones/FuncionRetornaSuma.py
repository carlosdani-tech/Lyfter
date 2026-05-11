def sum_numbers(numbers):
    total = 0

    for i in range(len(numbers)):
        total = total + numbers[i]

    return total

my_list = [4, 6, 2, 29]

result = sum_numbers(my_list)

print(result)