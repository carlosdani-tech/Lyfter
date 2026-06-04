from models import Categoria, Movimiento
from validators import (
    COLOR_PREDETERMINADO,
    convertir_fecha,
    fecha_hoy_texto,
    validar_categoria_existente,
    validar_color,
    validar_fecha,
    validar_monto,
    validar_texto_requerido,
)


class GestorFinanzas:
    def __init__(
        self,
        categorias: list[Categoria] | None = None,
        movimientos: list[Movimiento] | None = None,
    ) -> None:
        self.categorias = list(categorias) if categorias else []
        self.movimientos = list(movimientos) if movimientos else []

    def nombres_categorias(self) -> list[str]:
        nombres = []
        for categoria in self.categorias:
            nombres.append(categoria.nombre)
        return nombres

    def buscar_categoria(self, nombre: str) -> Categoria | None:
        nombre_buscado = nombre.strip().lower()
        for categoria in self.categorias:
            if categoria.nombre.lower() == nombre_buscado:
                return categoria
        return None

    def agregar_categoria(self, nombre: str, color: str = COLOR_PREDETERMINADO) -> Categoria:
        nombre_limpio = validar_texto_requerido(nombre, "categoria")
        for categoria in self.categorias:
            if categoria.nombre.lower() == nombre_limpio.lower():
                raise ValueError("La categoria ya existe.")

        nueva_categoria = Categoria(nombre_limpio, validar_color(color))
        self.categorias.append(nueva_categoria)
        return nueva_categoria

    def actualizar_color_categoria(self, nombre: str, color: str) -> Categoria:
        categoria = self.buscar_categoria(nombre)
        if categoria is None:
            raise ValueError("La categoria indicada no existe.")

        categoria.color = validar_color(color)
        return categoria

    def registrar_ingreso(
        self,
        titulo: str,
        monto: str | float | int,
        categoria: str,
        fecha: str | None = None,
    ) -> Movimiento:
        return self._crear_movimiento(titulo, monto, categoria, fecha, "ingreso")

    def registrar_gasto(
        self,
        titulo: str,
        monto: str | float | int,
        categoria: str,
        fecha: str | None = None,
    ) -> Movimiento:
        return self._crear_movimiento(titulo, monto, categoria, fecha, "gasto")

    def _crear_movimiento(
        self,
        titulo: str,
        monto: str | float | int,
        categoria: str,
        fecha: str | None,
        tipo: str,
    ) -> Movimiento:
        if not self.categorias:
            raise ValueError("Debe registrar al menos una categoria antes de agregar movimientos.")

        titulo_limpio = validar_texto_requerido(titulo, "titulo")
        monto_validado = validar_monto(monto)
        categoria_valida = validar_categoria_existente(categoria, self.nombres_categorias())
        fecha_valida = validar_fecha(fecha or fecha_hoy_texto())

        movimiento = Movimiento(titulo_limpio, monto_validado, categoria_valida, tipo, fecha_valida)
        self.movimientos.append(movimiento)
        return movimiento

    def total_ingresos(self, movimientos: list[Movimiento] | None = None) -> float:
        lista = movimientos if movimientos is not None else self.movimientos
        total = 0.0
        for movimiento in lista:
            if movimiento.tipo == "ingreso":
                total += movimiento.monto
        return total

    def total_gastos(self, movimientos: list[Movimiento] | None = None) -> float:
        lista = movimientos if movimientos is not None else self.movimientos
        total = 0.0
        for movimiento in lista:
            if movimiento.tipo == "gasto":
                total += movimiento.monto
        return total

    def saldo_actual(self, movimientos: list[Movimiento] | None = None) -> float:
        return self.total_ingresos(movimientos) - self.total_gastos(movimientos)

    def movimientos_para_tabla(self, movimientos: list[Movimiento] | None = None) -> list[list[str]]:
        lista = movimientos if movimientos is not None else self.movimientos
        filas = []
        for movimiento in lista:
            fila = [
                movimiento.fecha,
                movimiento.tipo.capitalize(),
                movimiento.titulo,
                movimiento.categoria,
                f"{movimiento.monto:.2f}",
            ]
            filas.append(fila)
        return filas

    def colores_para_filas(self, movimientos: list[Movimiento] | None = None) -> list[tuple[int, str, str]]:
        lista = movimientos if movimientos is not None else self.movimientos
        colores = []
        for indice, movimiento in enumerate(lista):
            categoria = self.buscar_categoria(movimiento.categoria)
            color = COLOR_PREDETERMINADO
            if categoria is not None:
                color = categoria.color
            colores.append((indice, "black", color))
        return colores

    def filtrar_movimientos_por_fecha(self, fecha_inicio: str, fecha_fin: str) -> list[Movimiento]:
        inicio = convertir_fecha(validar_fecha(fecha_inicio, permitir_futuro=True))
        fin = convertir_fecha(validar_fecha(fecha_fin, permitir_futuro=True))

        if inicio > fin:
            raise ValueError("La fecha de inicio no puede ser mayor que la fecha fin.")

        filtrados = []
        for movimiento in self.movimientos:
            fecha_movimiento = convertir_fecha(movimiento.fecha)
            if inicio <= fecha_movimiento <= fin:
                filtrados.append(movimiento)
        return filtrados

    def movimientos_para_csv(self) -> list[list[str]]:
        filas = []
        for movimiento in self.movimientos:
            monto = movimiento.monto
            if movimiento.tipo == "gasto":
                monto = -monto

            fila = [
                movimiento.fecha,
                movimiento.titulo,
                self._formatear_numero(monto),
                movimiento.categoria,
                movimiento.tipo.capitalize(),
            ]
            filas.append(fila)
        return filas

    def resumen_para_csv(self) -> list[str]:
        return [
            f"Ingresos: \u20A1{self._formatear_numero(self.total_ingresos())}",
            f"Gastos: \u20A1{self._formatear_numero(self.total_gastos())}",
            f"Balance Neto: \u20A1{self._formatear_numero(self.saldo_actual())}",
        ]

    def _formatear_numero(self, valor: float) -> str:
        if int(valor) == valor:
            return str(int(valor))
        return f"{valor:.2f}"

    def exportar_datos(self) -> dict:
        return {
            "categorias": [categoria.to_dict() for categoria in self.categorias],
            "movimientos": [movimiento.to_dict() for movimiento in self.movimientos],
        }

    @classmethod
    def desde_dict(cls, data: dict) -> "GestorFinanzas":
        categorias = [Categoria.from_dict(item) for item in data.get("categorias", [])]
        movimientos = [Movimiento.from_dict(item) for item in data.get("movimientos", [])]
        return cls(categorias, movimientos)
