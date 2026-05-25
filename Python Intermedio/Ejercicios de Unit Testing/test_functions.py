import unittest

from functions import (
    bubble_sort,
    sum_numbers,
    reverse_string,
    count_upper_lower,
    sort_words,
    is_prime,
    get_prime_numbers
)


class TestBubbleSort(unittest.TestCase):

    def test_bubble_sort_small_list(self):
        self.assertEqual(bubble_sort([5, 2, 8, 1]), [1, 2, 5, 8])

    def test_bubble_sort_large_list(self):
        numbers = list(range(150, 0, -1))
        expected = list(range(1, 151))
        self.assertEqual(bubble_sort(numbers), expected)

    def test_bubble_sort_empty_list(self):
        self.assertEqual(bubble_sort([]), [])

    def test_bubble_sort_invalid_parameter(self):
        with self.assertRaises(TypeError):
            bubble_sort("not a list")


class TestFunctions(unittest.TestCase):

    def test_sum_numbers_case_1(self):
        self.assertEqual(sum_numbers([4, 6, 2, 29]), 41)

    def test_sum_numbers_case_2(self):
        self.assertEqual(sum_numbers([1, 2, 3]), 6)

    def test_sum_numbers_case_3(self):
        self.assertEqual(sum_numbers([-5, 10, 15]), 20)

    def test_reverse_string_case_1(self):
        self.assertEqual(reverse_string("Hola mundo"), "odnum aloH")

    def test_reverse_string_case_2(self):
        self.assertEqual(reverse_string("Python"), "nohtyP")

    def test_reverse_string_case_3(self):
        self.assertEqual(reverse_string("abc"), "cba")

    def test_count_upper_lower_case_1(self):
        self.assertEqual(count_upper_lower("I love Nacion Sushi"), (3, 13))

    def test_count_upper_lower_case_2(self):
        self.assertEqual(count_upper_lower("ABCabc"), (3, 3))

    def test_count_upper_lower_case_3(self):
        self.assertEqual(count_upper_lower("Hello World"), (2, 8))

    def test_sort_words_case_1(self):
        text = "python-variable-funcion-computadora-monitor"
        self.assertEqual(
            sort_words(text),
            "computadora-funcion-monitor-python-variable"
        )

    def test_sort_words_case_2(self):
        self.assertEqual(sort_words("zorro-avion-casa"), "avion-casa-zorro")

    def test_sort_words_case_3(self):
        self.assertEqual(sort_words("rojo-azul-verde"), "azul-rojo-verde")

    def test_get_prime_numbers_case_1(self):
        self.assertEqual(get_prime_numbers([1, 4, 6, 7, 13, 9, 67]), [7, 13, 67])

    def test_get_prime_numbers_case_2(self):
        self.assertEqual(get_prime_numbers([2, 3, 4, 5, 6]), [2, 3, 5])

    def test_get_prime_numbers_case_3(self):
        self.assertEqual(get_prime_numbers([10, 11, 12, 17, 20]), [11, 17])


if __name__ == "__main__":
    unittest.main()