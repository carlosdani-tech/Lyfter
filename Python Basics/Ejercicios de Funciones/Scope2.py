message = "Original message"

def change_message():
    global message
    message = "New message"

print(message)

change_message()

print(message)