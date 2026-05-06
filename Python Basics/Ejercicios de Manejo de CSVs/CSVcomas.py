import csv

def save_videogames(file_path, data):

    # Abrimos el archivo en modo escritura
    with open(file_path, 'w', encoding='utf-8', newline='') as file:

        # Obtenemos los encabezados usando las llaves del primer diccionario
        headers = data[0].keys()

        # Creamos el escritor CSV
        writer = csv.DictWriter(
            file, 
            fieldnames=headers)

        # Escribimos los encabezados
        writer.writeheader()

        # Escribimos todos los videojuegos
        writer.writerows(data)


# Lista donde se almacenarán los videojuegos
videogames = []

# Cantidad de videojuegos
amount = int(input("How many videogames do you want to enter?: "))

# Recolección de datos
for i in range(amount):

    print("\nVideogame", i + 1)

    name = input("Name: ")
    genre = input("Genre: ")
    developer = input("Developer: ")
    classification = input("ESRB Classification: ")

    # Crear diccionario
    videogame = {
        "Name": name,
        "Genre": genre,
        "Developer": developer,
        "Classification": classification
    }

    # Agregar a la lista
    videogames.append(videogame)


# Guardar archivo CSV
save_videogames("videogames.csv", videogames)

print("CSV file created successfully.")