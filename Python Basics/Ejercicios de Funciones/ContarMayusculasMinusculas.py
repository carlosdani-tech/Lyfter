def count_upper_lower(text):
    upper_count = 0
    lower_count = 0

    for i in range(len(text)):
        if text[i] >= "A" and text[i] <= "Z":
            upper_count += 1
        elif text[i] >= "a" and text[i] <= "z":
            lower_count += 1

    print("There are", upper_count, "upper cases and", lower_count, "lower cases")

my_text = "I love Nación Sushi"

count_upper_lower(my_text)