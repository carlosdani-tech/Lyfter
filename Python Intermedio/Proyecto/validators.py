from datetime import date, datetime
import re


COLOR_PREDETERMINADO = "#FFFFFF"


def validar_texto_requerido(valor: str, nombre_campo: str) -> str:
    texto = valor.strip()
    if not texto:
        raise ValueError(f"El campo '{nombre_campo}' es obligatorio.")
    return texto


def validar_monto(valor: str | float | int) -> float:
    try:
        monto = float(valor)
    except (TypeError, ValueError):
        raise ValueError("El monto debe ser un numero valido.")

    if monto <= 0:
        raise ValueError("El monto debe ser mayor que cero.")
    return monto


def validar_tipo_movimiento(tipo: str) -> str:
    tipo_normalizado = tipo.strip().lower()
    if tipo_normalizado not in {"ingreso", "gasto"}:
        raise ValueError("El tipo de movimiento no es valido.")
    return tipo_normalizado


def validar_categoria_existente(nombre_categoria: str, categorias: list[str]) -> str:
    categoria = validar_texto_requerido(nombre_categoria, "categoria")
    for nombre in categorias:
        if categoria.lower() == nombre.strip().lower():
            return nombre
    raise ValueError("La categoria indicada no existe.")


def fecha_hoy_texto() -> str:
    return date.today().strftime("%d/%m/%Y")


def convertir_fecha(valor: str) -> date:
    texto = validar_texto_requerido(valor, "fecha")
    try:
        return datetime.strptime(texto, "%d/%m/%Y").date()
    except ValueError:
        raise ValueError("Formato de fecha invalido (use dd/mm/yyyy)")


def validar_fecha(valor: str, permitir_futuro: bool = False) -> str:
    fecha = convertir_fecha(valor)
    if not permitir_futuro and fecha > date.today():
        raise ValueError("La fecha no puede ser en el futuro")
    return fecha.strftime("%d/%m/%Y")


def validar_color(color: str | None) -> str:
    if color is None:
        return COLOR_PREDETERMINADO

    color_limpio = color.strip()
    if not color_limpio:
        return COLOR_PREDETERMINADO

    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", color_limpio):
        raise ValueError("El color debe tener el formato hexadecimal #RRGGBB.")
    return color_limpio.upper()
