import tempfile
from datetime import date, timedelta
from pathlib import Path

import pytest

from logic import GestorFinanzas
from persistencia import RepositorioFinanzas
from validators import (
    COLOR_PREDETERMINADO,
    validar_categoria_existente,
    validar_fecha,
    validar_monto,
    validar_texto_requerido,
    validar_tipo_movimiento,
)


@pytest.fixture
def gestor() -> GestorFinanzas:
    return GestorFinanzas()


def test_agregar_categoria_guarda_nombre_limpio(gestor: GestorFinanzas) -> None:
    categoria = gestor.agregar_categoria("  Comida  ")
    assert categoria.nombre == "Comida"
    assert categoria.color == COLOR_PREDETERMINADO
    assert gestor.nombres_categorias() == ["Comida"]


def test_no_permite_categoria_duplicada(gestor: GestorFinanzas) -> None:
    gestor.agregar_categoria("Comida")
    with pytest.raises(ValueError):
        gestor.agregar_categoria("comida")


def test_registrar_gasto_sin_categorias_falla(gestor: GestorFinanzas) -> None:
    with pytest.raises(ValueError):
        gestor.registrar_gasto("Supermercado", 20, "Comida")


def test_registrar_ingreso_actualiza_totales(gestor: GestorFinanzas) -> None:
    gestor.agregar_categoria("Salario")
    movimiento = gestor.registrar_ingreso("Pago mensual", 1500, "Salario", "20/07/2025")
    assert movimiento.fecha == "20/07/2025"
    assert gestor.total_ingresos() == 1500
    assert gestor.saldo_actual() == 1500


def test_registrar_gasto_actualiza_saldo(gestor: GestorFinanzas) -> None:
    gestor.agregar_categoria("Comida", "#FFA500")
    gestor.agregar_categoria("Salario")
    gestor.registrar_ingreso("Pago mensual", 2000, "Salario", "02/07/2025")
    gestor.registrar_gasto("Supermercado", 250, "Comida", "03/07/2025")
    assert gestor.total_gastos() == 250
    assert gestor.saldo_actual() == 1750
    assert gestor.colores_para_filas()[1] == (1, "black", "#FFA500")


def test_validar_monto_rechaza_texto_invalido() -> None:
    with pytest.raises(ValueError):
        validar_monto("abc")


def test_validar_texto_requerido_rechaza_vacio() -> None:
    with pytest.raises(ValueError):
        validar_texto_requerido("   ", "titulo")


def test_validar_tipo_movimiento_rechaza_tipo_desconocido() -> None:
    with pytest.raises(ValueError):
        validar_tipo_movimiento("transferencia")


def test_validar_fecha_rechaza_formato_invalido() -> None:
    with pytest.raises(ValueError):
        validar_fecha("2025-07-20")


def test_validar_fecha_rechaza_fecha_futura() -> None:
    manana = (date.today() + timedelta(days=1)).strftime("%d/%m/%Y")
    with pytest.raises(ValueError):
        validar_fecha(manana)


def test_validar_categoria_existente_rechaza_categoria_inexistente() -> None:
    with pytest.raises(ValueError):
        validar_categoria_existente("Ocio", ["Comida", "Transporte"])


def test_filtrar_movimientos_por_rango(gestor: GestorFinanzas) -> None:
    gestor.agregar_categoria("Trabajo")
    gestor.agregar_categoria("Comida")
    gestor.registrar_ingreso("Salario", 1000, "Trabajo", "02/07/2025")
    gestor.registrar_gasto("Comida", 20, "Comida", "03/07/2025")
    gestor.registrar_gasto("Ropa", 50, "Comida", "12/07/2025")

    movimientos = gestor.filtrar_movimientos_por_fecha("01/07/2025", "10/07/2025")

    assert len(movimientos) == 2
    assert [movimiento.titulo for movimiento in movimientos] == ["Salario", "Comida"]


def test_exportar_csv_genera_archivo_con_totales(gestor: GestorFinanzas) -> None:
    gestor.agregar_categoria("Trabajo")
    gestor.agregar_categoria("Alimentacion")
    gestor.registrar_ingreso("Salario", 1200, "Trabajo", "01/07/2025")
    gestor.registrar_gasto("Comida", 100, "Alimentacion", "02/07/2025")

    raiz_proyecto = Path(__file__).resolve().parent.parent
    with tempfile.TemporaryDirectory(dir=raiz_proyecto) as directorio_prueba:
        ruta = Path(directorio_prueba) / "movimientos.csv"
        repositorio = RepositorioFinanzas()
        ruta_csv = repositorio.exportar_csv(gestor, ruta)
        contenido = ruta_csv.read_text(encoding="utf-8-sig")

    assert "Fecha,Titulo,Monto,Categoria,Tipo" in contenido
    assert "01/07/2025,Salario,1200,Trabajo,Ingreso" in contenido
    assert "02/07/2025,Comida,-100,Alimentacion,Gasto" in contenido
    assert "Ingresos: ₡1200" in contenido
    assert "Gastos: ₡100" in contenido
    assert "Balance Neto: ₡1100" in contenido


def test_persistencia_guarda_y_recupera_datos(gestor: GestorFinanzas) -> None:
    gestor.agregar_categoria("Salario", "#00FF00")
    gestor.registrar_ingreso("Pago mensual", 1000, "Salario", "20/07/2025")

    raiz_proyecto = Path(__file__).resolve().parent.parent
    with tempfile.TemporaryDirectory(dir=raiz_proyecto) as directorio_prueba:
        ruta = Path(directorio_prueba) / "finanzas.json"
        repositorio = RepositorioFinanzas(ruta)
        repositorio.guardar(gestor)
        gestor_recargado = repositorio.cargar()

    assert gestor_recargado.nombres_categorias() == ["Salario"]
    assert gestor_recargado.categorias[0].color == "#00FF00"
    assert gestor_recargado.total_ingresos() == 1000
    assert len(gestor_recargado.movimientos) == 1
    assert gestor_recargado.movimientos[0].fecha == "20/07/2025"
