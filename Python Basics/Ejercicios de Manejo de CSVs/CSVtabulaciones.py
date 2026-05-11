import csv

def save_videogames_tabs(file_path, data):

    # Abrimos archivo
    with open(file_path, 'w', encoding='utf-8', newline='') as file:

        # Encabezados
        headers = data[0].keys()

        # DictWriter usando tabulaciones
        writer = csv.DictWriter(
            file,
            fieldnames=headers,
            delimiter='\t'
        )

        # Escribir encabezados
        writer.writeheader()

        # Escribir datos
        writer.writerows(data)


# Lista principal
videogames = []

# Cantidad de videojuegos
amount = int(input("How many videogames do you want to enter?: "))

# Pedir datos
for i in range(amount):

    print("\nVideogame", i + 1)

    name = input("Name: ")
    genre = input("Genre: ")
    developer = input("Developer: ")
    classification = input("ESRB Classification: ")

    videogame = {
        "Name": name,
        "Genre": genre,
        "Developer": developer,
        "Classification": classification
    }

    videogames.append(videogame)


# Guardar archivo
save_videogames_tabs("videogames_tabs.csv", videogames)

print("Tab separated file created successfully.")