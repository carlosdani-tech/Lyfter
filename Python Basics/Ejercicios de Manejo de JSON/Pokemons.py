import json


def load_pokemons(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        pokemons = json.load(file)

    return pokemons


def save_pokemons(file_path, data):
    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4)


def show_current_pokemons(pokemons):
    print("Current Pokemons:")

    for pokemon in pokemons:
        print("-", pokemon["name"])


def get_boolean_value():
    shiny_input = input("Is shiny? (yes/no): ")

    if shiny_input.lower() == "yes":
        return True
    else:
        return False


def get_held_item():
    held_item = input("Held item (leave empty for none): ")

    if held_item == "":
        return None

    return held_item


def get_skills():
    skills = []

    print("\nEnter 4 skills")

    for i in range(4):
        skill = input("Skill " + str(i + 1) + ": ")
        skills.append(skill)

    return skills


def get_stats():
    print("\nEnter Pokemon stats")

    stats = {
        "hp": int(input("HP: ")),
        "attack": int(input("Attack: ")),
        "defense": int(input("Defense: ")),
        "sp_attack": int(input("Special Attack: ")),
        "sp_defense": int(input("Special Defense: ")),
        "speed": int(input("Speed: "))
    }

    return stats


def get_new_pokemon():
    print("\nEnter the new Pokemon information")

    name = input("Name: ")
    pokemon_type = input("Type: ")
    level = int(input("Level: "))
    weight = float(input("Weight in KG: "))

    is_shiny = get_boolean_value()
    held_item = get_held_item()
    skills = get_skills()
    stats = get_stats()

    new_pokemon = {
        "name": name,
        "type": pokemon_type,
        "level": level,
        "weight_kg": weight,
        "is_shiny": is_shiny,
        "held_item": held_item,
        "skills": skills,
        "stats": stats
    }

    return new_pokemon


def main():
    file_path = "pokemons.json"

    pokemons = load_pokemons(file_path)

    show_current_pokemons(pokemons)

    new_pokemon = get_new_pokemon()

    pokemons.append(new_pokemon)

    save_pokemons(file_path, pokemons)

    print("\nPokemon added successfully.")


main()