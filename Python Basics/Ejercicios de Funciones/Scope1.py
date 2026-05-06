def my_function():
    local_variable = "I am inside the function"
    print(local_variable)

my_function()

# Esto da error porque local_variable solo existe dentro de la función
print(local_variable)