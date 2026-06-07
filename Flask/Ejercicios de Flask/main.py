from flask import Flask, request, jsonify
import json
import os

app = Flask(__name__)

ARCHIVO_TAREAS = "tareas.json"

ESTADOS_VALIDOS = ["Por Hacer", "En Progreso", "Completada"]


def leer_tareas():
    #Lee las tareas desde el archivo JSON. Si el archivo no existe, lo crea vacío.

    if not os.path.exists(ARCHIVO_TAREAS):
        with open(ARCHIVO_TAREAS, "w", encoding="utf-8") as archivo:
            json.dump([], archivo, indent=4, ensure_ascii=False)

    with open(ARCHIVO_TAREAS, "r", encoding="utf-8") as archivo:
        return json.load(archivo)


def guardar_tareas(tareas):
    #Guarda las tareas en el archivo JSON.

    with open(ARCHIVO_TAREAS, "w", encoding="utf-8") as archivo:
        json.dump(tareas, archivo, indent=4, ensure_ascii=False)


def validar_tarea(data):
    #Valida que la tarea tenga los datos requeridos.

    if "identificador" not in data:
        return "El identificador es obligatorio"

    if "titulo" not in data or data["titulo"].strip() == "":
        return "No se pueden agregar tareas sin nombre"

    if "descripcion" not in data or data["descripcion"].strip() == "":
        return "No se pueden agregar tareas sin descripción"

    if "estado" not in data or data["estado"].strip() == "":
        return "No se pueden agregar tareas sin estado"

    if data["estado"] not in ESTADOS_VALIDOS:
        return "No se pueden agregar tareas con un estado inválido"

    return None


@app.route("/")
def inicio():
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
def obtener_tareas():
    #Obtiene todas las tareas. También permite filtrar por estado usando query parameter. Ejemplo: /tareas?estado=Por Hacer

    tareas = leer_tareas()

    estado = request.args.get("estado")

    if estado:
        tareas_filtradas = [
            tarea for tarea in tareas
            if tarea["estado"].lower() == estado.lower()
        ]

        return jsonify({
            "total": len(tareas_filtradas),
            "tareas": tareas_filtradas
        }), 200

    return jsonify({
        "total": len(tareas),
        "tareas": tareas
    }), 200


@app.route("/tareas", methods=["POST"])
def crear_tarea():
    #Crea una nueva tarea.

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Debe enviar datos en formato JSON"
        }), 400

    error = validar_tarea(data)

    if error:
        return jsonify({
            "error": error
        }), 400

    tareas = leer_tareas()

    for tarea in tareas:
        if tarea["identificador"] == data["identificador"]:
            return jsonify({
                "error": "No se pueden agregar tareas con identificadores ya existentes"
            }), 400

    nueva_tarea = {
        "identificador": data["identificador"],
        "titulo": data["titulo"],
        "descripcion": data["descripcion"],
        "estado": data["estado"]
    }

    tareas.append(nueva_tarea)
    guardar_tareas(tareas)

    return jsonify({
        "mensaje": "Tarea creada correctamente",
        "tarea": nueva_tarea
    }), 201


@app.route("/tareas/<identificador>", methods=["PUT"])
def editar_tarea(identificador):
    #Edita una tarea existente según su identificador.

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Debe enviar datos en formato JSON"
        }), 400

    tareas = leer_tareas()

    tarea_encontrada = None

    for tarea in tareas:
        if str(tarea["identificador"]) == str(identificador):
            tarea_encontrada = tarea
            break

    if not tarea_encontrada:
        return jsonify({
            "error": "Tarea no encontrada"
        }), 404

    nuevo_titulo = data.get("titulo", tarea_encontrada["titulo"])
    nueva_descripcion = data.get("descripcion", tarea_encontrada["descripcion"])
    nuevo_estado = data.get("estado", tarea_encontrada["estado"])

    if nuevo_titulo.strip() == "":
        return jsonify({
            "error": "No se pueden agregar tareas sin nombre"
        }), 400

    if nueva_descripcion.strip() == "":
        return jsonify({
            "error": "No se pueden agregar tareas sin descripción"
        }), 400

    if nuevo_estado.strip() == "":
        return jsonify({
            "error": "No se pueden agregar tareas sin estado"
        }), 400

    if nuevo_estado not in ESTADOS_VALIDOS:
        return jsonify({
            "error": "No se pueden agregar tareas con un estado inválido"
        }), 400

    tarea_encontrada["titulo"] = nuevo_titulo
    tarea_encontrada["descripcion"] = nueva_descripcion
    tarea_encontrada["estado"] = nuevo_estado

    guardar_tareas(tareas)

    return jsonify({
        "mensaje": "Tarea editada correctamente",
        "tarea": tarea_encontrada
    }), 200


@app.route("/tareas/<identificador>", methods=["DELETE"])
def eliminar_tarea(identificador):
    #Elimina una tarea según su identificador.

    tareas = leer_tareas()

    for tarea in tareas:
        if str(tarea["identificador"]) == str(identificador):
            tareas.remove(tarea)
            guardar_tareas(tareas)

            return jsonify({
                "mensaje": "Tarea eliminada correctamente",
                "tarea_eliminada": tarea
            }), 200

    return jsonify({
        "error": "Tarea no encontrada"
    }), 404


if __name__ == "__main__":
    app.run(host="localhost", debug=True)