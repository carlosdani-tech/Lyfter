def bubble_sort(numbers):

    size = len(numbers)

    for i in range(size):

        for j in range(0, size - 1 - i):

            if numbers[j] > numbers[j + 1]:

                # Intercambiar valores
                temp = numbers[j]

                numbers[j] = numbers[j + 1]

                numbers[j + 1] = temp

    return numbers


my_list = [9, 4, 7, 2, 8, 1]

result = bubble_sort(my_list)

print(result)