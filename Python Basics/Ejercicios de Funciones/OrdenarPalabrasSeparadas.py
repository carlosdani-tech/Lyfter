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

my_text = "python-variable-funcion-computadora-monitor"

result = sort_words(my_text)

print(result)