from flask import Flask, request, jsonify
import json
import os

app = Flask(__name__)

TASKS_FILE = "tareas.json"

VALID_STATUSES = ["Por Hacer", "En Progreso", "Completada"]


def read_tasks():
    # Lee las tareas desde el archivo JSON. Si el archivo no existe, lo crea vacío.
    if not os.path.exists(TASKS_FILE):
        with open(TASKS_FILE, "w", encoding="utf-8") as file:
            json.dump([], file, indent=4, ensure_ascii=False)

    with open(TASKS_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def save_tasks(tasks):
    # Guarda las tareas en el archivo JSON.
    with open(TASKS_FILE, "w", encoding="utf-8") as file:
        json.dump(tasks, file, indent=4, ensure_ascii=False)


def validate_task(data):
    # Valida que la tarea tenga los datos requeridos.
    if "identificador" not in data:
        return "El identificador es obligatorio"

    if "titulo" not in data or data["titulo"].strip() == "":
        return "No se pueden agregar tareas sin nombre"

    if "descripcion" not in data or data["descripcion"].strip() == "":
        return "No se pueden agregar tareas sin descripción"

    if "estado" not in data or data["estado"].strip() == "":
        return "No se pueden agregar tareas sin estado"

    if data["estado"] not in VALID_STATUSES:
        return "No se pueden agregar tareas con un estado inválido"

    return None


def task_ids_match(left_id, right_id):
    # Compara identificadores con la misma regla en toda la API.
    return str(left_id) == str(right_id)


@app.route("/")
def home():
    return jsonify({
        "mensaje": "API de tareas funcionando correctamente",
        "endpoints": {
            "obtener_tareas": "GET /tareas",
            "filtrar_por_estado": "GET /tareas?estado=Por Hacer",
            "crear_tarea": "POST /tareas",
            "editar_tarea": "PUT /tareas/<identificador>",
            "eliminar_tarea": "DELETE /tareas/<identificador>"
        }
    })


@app.route("/tareas", methods=["GET"])
def get_tasks():
    # Obtiene todas las tareas. También permite filtrar por estado usando query parameter.
    # Ejemplo: /tareas?estado=Por Hacer
    tasks = read_tasks()
    status = request.args.get("estado")

    if status:
        filtered_tasks = [
            task for task in tasks
            if task["estado"].lower() == status.lower()
        ]

        return jsonify({
            "total": len(filtered_tasks),
            "tareas": filtered_tasks
        }), 200

    return jsonify({
        "total": len(tasks),
        "tareas": tasks
    }), 200


@app.route("/tareas", methods=["POST"])
def create_task():
    # Crea una nueva tarea.
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Debe enviar datos en formato JSON"
        }), 400

    error = validate_task(data)

    if error:
        return jsonify({
            "error": error
        }), 400

    tasks = read_tasks()

    for task in tasks:
        if task_ids_match(task["identificador"], data["identificador"]):
            return jsonify({
                "error": "No se pueden agregar tareas con identificadores ya existentes"
            }), 400

    new_task = {
        "identificador": data["identificador"],
        "titulo": data["titulo"],
        "descripcion": data["descripcion"],
        "estado": data["estado"]
    }

    tasks.append(new_task)
    save_tasks(tasks)

    return jsonify({
        "mensaje": "Tarea creada correctamente",
        "tarea": new_task
    }), 201


@app.route("/tareas/<identificador>", methods=["PUT"])
def update_task(identificador):
    # Edita una tarea existente según su identificador.
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Debe enviar datos en formato JSON"
        }), 400

    tasks = read_tasks()
    found_task = None

    for task in tasks:
        if task_ids_match(task["identificador"], identificador):
            found_task = task
            break

    if not found_task:
        return jsonify({
            "error": "Tarea no encontrada"
        }), 404

    new_title = data.get("titulo", found_task["titulo"])
    new_description = data.get("descripcion", found_task["descripcion"])
    new_status = data.get("estado", found_task["estado"])

    if new_title.strip() == "":
        return jsonify({
            "error": "No se pueden agregar tareas sin nombre"
        }), 400

    if new_description.strip() == "":
        return jsonify({
            "error": "No se pueden agregar tareas sin descripción"
        }), 400

    if new_status.strip() == "":
        return jsonify({
            "error": "No se pueden agregar tareas sin estado"
        }), 400

    if new_status not in VALID_STATUSES:
        return jsonify({
            "error": "No se pueden agregar tareas con un estado inválido"
        }), 400

    found_task["titulo"] = new_title
    found_task["descripcion"] = new_description
    found_task["estado"] = new_status

    save_tasks(tasks)

    return jsonify({
        "mensaje": "Tarea editada correctamente",
        "tarea": found_task
    }), 200


@app.route("/tareas/<identificador>", methods=["DELETE"])
def delete_task(identificador):
    # Elimina una tarea según su identificador.
    tasks = read_tasks()

    for task in tasks:
        if task_ids_match(task["identificador"], identificador):
            tasks.remove(task)
            save_tasks(tasks)

            return jsonify({
                "mensaje": "Tarea eliminada correctamente",
                "tarea_eliminada": task
            }), 200

    return jsonify({
        "error": "Tarea no encontrada"
    }), 404


if __name__ == "__main__":
    app.run(host="localhost", debug=True)
