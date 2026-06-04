# =========================================
# 1. Bubble Sort → O(n²)
# =========================================

def bubble_sort(numbers):

    size = len(numbers)

    for i in range(size):

        for j in range(0, size - 1 - i):

            if numbers[j] > numbers[j + 1]:

                temp = numbers[j]

                numbers[j] = numbers[j + 1]

                numbers[j + 1] = temp

    return numbers


# Big O:
# O(n²)
# Porque tiene dos ciclos anidados.


# =========================================
# 2. print_numbers_times_2 → O(n)
# =========================================

def print_numbers_times_2(numbers_list):

    for number in numbers_list:

        print(number * 2)


# Big O:
# O(n)
# Porque recorre la lista una sola vez.


# =========================================
# 3. check_if_lists_have_an_equal → O(n²)
# =========================================

def check_if_lists_have_an_equal(list_a, list_b):

    for element_a in list_a:

        for element_b in list_b:

            if element_a == element_b:

                return True

    return False


# Big O:
# O(n²)
# Porque compara cada elemento de una lista
# con todos los elementos de la otra.


# =========================================
# 4. print_10_or_less_elements → O(1)
# =========================================

def print_10_or_less_elements(list_to_print):

    list_len = len(list_to_print)

    for index in range(min(list_len, 10)):

        print(list_to_print[index])


# Big O:
# O(1)
# Porque nunca recorre más de 10 elementos.


# =========================================
# 5. generate_list_trios → O(n³)
# =========================================

def generate_list_trios(list_a, list_b, list_c):

    result_list = []

    for element_a in list_a:

        for element_b in list_b:

            for element_c in list_c:

                result_list.append(
                    f'{element_a} {element_b} {element_c}'
                )

    return result_list


# Big O:
# O(n³)
# Porque tiene tres ciclos anidados.


# =========================================
# PRUEBAS
# =========================================

print("\nBubble Sort")
print(bubble_sort([5, 2, 8, 1, 9]))


print("\nprint_numbers_times_2")
print_numbers_times_2([1, 2, 3, 4])


print("\ncheck_if_lists_have_an_equal")
print(
    check_if_lists_have_an_equal(
        [1, 2, 3],
        [5, 6, 3]
    )
)


print("\nprint_10_or_less_elements")
print_10_or_less_elements(
    [1, 2, 3, 4, 5, 6]
)


print("\ngenerate_list_trios")
print(
    generate_list_trios(
        ["A", "B"],
        ["1", "2"],
        ["X", "Y"]
    )
)