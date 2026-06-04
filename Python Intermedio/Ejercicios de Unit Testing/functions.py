def bubble_sort(numbers):
    if not isinstance(numbers, list):
        raise TypeError("Parameter must be a list")

    size = len(numbers)

    for i in range(size):
        for j in range(0, size - 1 - i):
            if numbers[j] > numbers[j + 1]:
                temp = numbers[j]
                numbers[j] = numbers[j + 1]
                numbers[j + 1] = temp

    return numbers


def sum_numbers(numbers):
    total = 0

    for number in numbers:
        total = total + number

    return total


def reverse_string(text):
    reversed_text = ""

    for i in range(len(text) - 1, -1, -1):
        reversed_text = reversed_text + text[i]

    return reversed_text


def count_upper_lower(text):
    upper_count = 0
    lower_count = 0

    for character in text:
        if character >= "A" and character <= "Z":
            upper_count = upper_count + 1
        elif character >= "a" and character <= "z":
            lower_count = lower_count + 1

    return upper_count, lower_count


def sort_words(text):
    words = text.split("-")

    for i in range(len(words)):
        for j in range(i + 1, len(words)):
            if words[i] > words[j]:
                temp = words[i]
                words[i] = words[j]
                words[j] = temp

    result = ""

    for i in range(len(words)):
        result = result + words[i]

        if i < len(words) - 1:
            result = result + "-"

    return result


def is_prime(number):
    if number <= 1:
        return False

    for i in range(2, number):
        if number % i == 0:
            return False

    return True


def get_prime_numbers(numbers):
    prime_numbers = []

    for number in numbers:
        if is_prime(number):
            prime_numbers.append(number)

    return prime_numbers