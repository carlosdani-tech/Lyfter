my_list = [4, 3, 6, 1, 7]

temp = my_list[0]
my_list[0] = my_list[-1]
my_list[-1] = temp

print(my_list)