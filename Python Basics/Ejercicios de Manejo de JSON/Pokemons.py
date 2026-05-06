import json

def load_pokemons(file_path):

    # Abrir archivo en modo lectura
    with open(file_path, "r", encoding="utf-8") as file:

        # Cargar contenido JSON
        pokemons = json.load(file)

    return pokemons


def save_pokemons(file_path, data):

    # Abrir archivo en modo escritura
    with open(file_path, "w", encoding="utf-8") as file:

        # Guardar información en formato JSON
        json.dump(data, file, indent=4)


# Leer pokémon existentes
pokemons_list = load_pokemons("pokemons.json")

print("Current Pokemons:")
for pokemon in pokemons_list:
    print("-", pokemon["name"])


print("\nEnter the new Pokemon information")

# Datos principales
name = input("Name: ")
pokemon_type = input("Type: ")
level = int(input("Level: "))
weight = float(input("Weight in KG: "))

# Booleano
shiny_input = input("Is shiny? (yes/no): ")

if shiny_input.lower() == "yes":
    is_shiny = True
else:
    is_shiny = False

# Null o item
held_item = input("Held item (leave empty for none): ")

if held_item == "":
    held_item = None


# Skills
skills = []

print("\nEnter 4 skills")

for i in range(4):

    skill = input("Skill " + str(i + 1) + ": ")

    skills.append(skill)


# Stats
print("\nEnter Pokemon stats")

hp = int(input("HP: "))
attack = int(input("Attack: "))
defense = int(input("Defense: "))
sp_attack = int(input("Special Attack: "))
sp_defense = int(input("Special Defense: "))
speed = int(input("Speed: "))


# Crear nuevo Pokémon
new_pokemon = {
    "name": name,
    "type": pokemon_type,
    "level": level,
    "weight_kg": weight,
    "is_shiny": is_shiny,
    "held_item": held_item,
    "skills": skills,
    "stats": {
        "hp": hp,
        "attack": attack,
        "defense": defense,
        "sp_attack": sp_attack,
        "sp_defense": sp_defense,
        "speed": speed
    }
}


# Agregar nuevo Pokémon a la lista
pokemons_list.append(new_pokemon)


# Guardar nuevamente el archivo JSON
save_pokemons("pokemons.json", pokemons_list)

print("\nPokemon added successfully.")