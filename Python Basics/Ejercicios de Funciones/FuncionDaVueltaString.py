def reverse_string(text):
    reversed_text = ""

    for i in range(len(text) - 1, -1, -1):
        reversed_text = reversed_text + text[i]

    return reversed_text

my_text = "Hola mundo"

result = reverse_string(my_text)

print(result)