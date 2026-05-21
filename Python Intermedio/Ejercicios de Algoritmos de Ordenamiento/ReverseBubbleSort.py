def reverse_bubble_sort(numbers):

    size = len(numbers)

    for i in range(size):

        for j in range(size - 1, i, -1):

            if numbers[j] < numbers[j - 1]:

                temp = numbers[j]

                numbers[j] = numbers[j - 1]

                numbers[j - 1] = temp

    return numbers


my_list = [9, 8, 7, 6, 5, 4, 3, 1, 2]

result = reverse_bubble_sort(my_list)

print(result)