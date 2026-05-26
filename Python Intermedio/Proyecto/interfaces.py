from logic import GestorFinanzas
from persistencia import RepositorioFinanzas
from validators import COLOR_PREDETERMINADO, fecha_hoy_texto

try:
    import FreeSimpleGUI as sg
except ImportError as error:
    raise ImportError(
        "No se pudo importar FreeSimpleGUI. Instale la dependencia con 'pip install FreeSimpleGUI'."
    ) from error


def crear_ventana_principal() -> "sg.Window":
    encabezados = ["Fecha", "Tipo", "Titulo", "Categoria", "Monto"]
    layout = [
        [sg.Text("Gestor de Finanzas Personales", font=("Arial", 16, "bold"))],
        [
            sg.Text("Fecha inicio"),
            sg.Input(key="-FECHA-INICIO-", size=(12, 1)),
            sg.Text("Fecha fin"),
            sg.Input(key="-FECHA-FIN-", size=(12, 1)),
            sg.Button("Filtrar", key="-FILTRAR-"),
            sg.Button("Mostrar todos", key="-MOSTRAR-TODOS-"),
            sg.Button("Exportar a CSV", key="-EXPORTAR-CSV-"),
        ],
        [
            sg.Table(
                values=[],
                headings=encabezados,
                key="-TABLA-",
                auto_size_columns=True,
                justification="center",
                expand_x=True,
                expand_y=True,
                num_rows=12,
            )
        ],
        [
            sg.Text("Total ingresos:"),
            sg.Text("0.00", key="-TOTAL-INGRESOS-"),
            sg.Text("Total gastos:"),
            sg.Text("0.00", key="-TOTAL-GASTOS-"),
            sg.Text("Saldo:"),
            sg.Text("0.00", key="-SALDO-"),
        ],
        [
            sg.Button("Agregar categoria", key="-AGREGAR-CATEGORIA-"),
            sg.Button("Editar color categoria", key="-EDITAR-COLOR-CATEGORIA-"),
            sg.Button("Agregar gasto", key="-AGREGAR-GASTO-"),
            sg.Button("Agregar ingreso", key="-AGREGAR-INGRESO-"),
            sg.Button("Salir"),
        ],
    ]
    return sg.Window("Gestor de Finanzas", layout, finalize=True, resizable=True)


def mostrar_formulario_categoria() -> tuple[str, str] | None:
    layout = [
        [sg.Text("Nombre de la categoria")],
        [sg.Input(key="-NOMBRE-")],
        [sg.Text("Color"), sg.Input(COLOR_PREDETERMINADO, key="-COLOR-", size=(12, 1))],
        [sg.ColorChooserButton("Elegir color", target="-COLOR-")],
        [sg.Button("Guardar"), sg.Button("Cancelar")],
    ]
    ventana = sg.Window("Nueva categoria", layout, modal=True)

    while True:
        evento, valores = ventana.read()
        if evento in (sg.WINDOW_CLOSED, "Cancelar"):
            ventana.close()
            return None
        if evento == "Guardar":
            ventana.close()
            return valores["-NOMBRE-"], valores["-COLOR-"]


def mostrar_formulario_editar_color(categorias: list[str]) -> tuple[str, str] | None:
    layout = [
        [sg.Text("Categoria"), sg.Combo(categorias, key="-CATEGORIA-", readonly=True)],
        [sg.Text("Color"), sg.Input(COLOR_PREDETERMINADO, key="-COLOR-", size=(12, 1))],
        [sg.ColorChooserButton("Elegir color", target="-COLOR-")],
        [sg.Button("Guardar"), sg.Button("Cancelar")],
    ]
    ventana = sg.Window("Editar color de categoria", layout, modal=True)

    while True:
        evento, valores = ventana.read()
        if evento in (sg.WINDOW_CLOSED, "Cancelar"):
            ventana.close()
            return None
        if evento == "Guardar":
            ventana.close()
            return valores["-CATEGORIA-"], valores["-COLOR-"]


def mostrar_formulario_movimiento(
    tipo: str, categorias: list[str]
) -> tuple[str, str, str, str] | None:
    layout = [
        [sg.Text(f"Registrar {tipo}")],
        [sg.Text("Titulo"), sg.Input(key="-TITULO-")],
        [sg.Text("Monto"), sg.Input(key="-MONTO-")],
        [sg.Text("Fecha"), sg.Input(fecha_hoy_texto(), key="-FECHA-", size=(12, 1))],
        [sg.Text("Categoria"), sg.Combo(categorias, key="-CATEGORIA-", readonly=True)],
        [sg.Button("Guardar"), sg.Button("Cancelar")],
    ]
    ventana = sg.Window(f"Nuevo {tipo}", layout, modal=True)

    while True:
        evento, valores = ventana.read()
        if evento in (sg.WINDOW_CLOSED, "Cancelar"):
            ventana.close()
            return None
        if evento == "Guardar":
            ventana.close()
            return valores["-TITULO-"], valores["-MONTO-"], valores["-CATEGORIA-"], valores["-FECHA-"]


def actualizar_resumen(
    ventana: "sg.Window",
    gestor: GestorFinanzas,
    movimientos: list | None = None,
) -> None:
    ventana["-TABLA-"].update(
        values=gestor.movimientos_para_tabla(movimientos),
        row_colors=gestor.colores_para_filas(movimientos),
    )
    ventana["-TOTAL-INGRESOS-"].update(f"{gestor.total_ingresos(movimientos):.2f}")
    ventana["-TOTAL-GASTOS-"].update(f"{gestor.total_gastos(movimientos):.2f}")
    ventana["-SALDO-"].update(f"{gestor.saldo_actual(movimientos):.2f}")


def guardar_y_actualizar(
    ventana: "sg.Window", gestor: GestorFinanzas, repositorio: RepositorioFinanzas
) -> None:
    repositorio.guardar(gestor)
    actualizar_resumen(ventana, gestor)


def manejar_nueva_categoria(
    ventana: "sg.Window", gestor: GestorFinanzas, repositorio: RepositorioFinanzas
) -> None:
    datos_categoria = mostrar_formulario_categoria()
    if datos_categoria is None:
        return

    nombre_categoria, color = datos_categoria
    try:
        gestor.agregar_categoria(nombre_categoria, color)
        guardar_y_actualizar(ventana, gestor, repositorio)
    except ValueError as error:
        sg.popup_error(str(error))


def manejar_nuevo_movimiento(
    ventana: "sg.Window",
    gestor: GestorFinanzas,
    repositorio: RepositorioFinanzas,
    tipo: str,
) -> None:
    if not gestor.categorias:
        sg.popup_error("Debe crear al menos una categoria antes de registrar movimientos.")
        return

    datos = mostrar_formulario_movimiento(tipo, gestor.nombres_categorias())
    if datos is None:
        return

    titulo, monto, categoria, fecha = datos

    try:
        if tipo == "gasto":
            gestor.registrar_gasto(titulo, monto, categoria, fecha)
        else:
            gestor.registrar_ingreso(titulo, monto, categoria, fecha)
        guardar_y_actualizar(ventana, gestor, repositorio)
    except ValueError as error:
        sg.popup_error(str(error))


def manejar_editar_color_categoria(
    ventana: "sg.Window", gestor: GestorFinanzas, repositorio: RepositorioFinanzas
) -> None:
    if not gestor.categorias:
        sg.popup_error("Debe crear al menos una categoria antes de editar su color.")
        return

    datos = mostrar_formulario_editar_color(gestor.nombres_categorias())
    if datos is None:
        return

    nombre_categoria, color = datos
    try:
        gestor.actualizar_color_categoria(nombre_categoria, color)
        guardar_y_actualizar(ventana, gestor, repositorio)
    except ValueError as error:
        sg.popup_error(str(error))


def manejar_filtrar_movimientos(
    ventana: "sg.Window",
    gestor: GestorFinanzas,
    valores: dict,
) -> None:
    try:
        movimientos = gestor.filtrar_movimientos_por_fecha(
            valores["-FECHA-INICIO-"],
            valores["-FECHA-FIN-"],
        )
        actualizar_resumen(ventana, gestor, movimientos)
    except ValueError as error:
        sg.popup_error(str(error))


def manejar_exportar_csv(gestor: GestorFinanzas, repositorio: RepositorioFinanzas) -> None:
    ruta = sg.popup_get_file(
        "Seleccione donde guardar el archivo CSV",
        title="Exportar movimientos",
        default_path="movimientos.csv",
        default_extension=".csv",
        save_as=True,
        file_types=(("CSV", "*.csv"),),
    )
    if not ruta:
        return

    ruta_guardada = repositorio.exportar_csv(gestor, ruta)
    sg.popup(f"Archivo CSV generado en:\n{ruta_guardada}")


def ejecutar_aplicacion() -> None:
    repositorio = RepositorioFinanzas()
    gestor = repositorio.cargar()
    ventana = crear_ventana_principal()
    actualizar_resumen(ventana, gestor)

    while True:
        evento, valores = ventana.read()
        if evento in (sg.WINDOW_CLOSED, "Salir"):
            repositorio.guardar(gestor)
            break

        elif evento == "-AGREGAR-CATEGORIA-":
            manejar_nueva_categoria(ventana, gestor, repositorio)

        elif evento == "-EDITAR-COLOR-CATEGORIA-":
            manejar_editar_color_categoria(ventana, gestor, repositorio)

        elif evento in {"-AGREGAR-GASTO-", "-AGREGAR-INGRESO-"}:
            tipo = "gasto" if evento == "-AGREGAR-GASTO-" else "ingreso"
            manejar_nuevo_movimiento(ventana, gestor, repositorio, tipo)

        elif evento == "-FILTRAR-":
            manejar_filtrar_movimientos(ventana, gestor, valores)

        elif evento == "-MOSTRAR-TODOS-":
            actualizar_resumen(ventana, gestor)

        elif evento == "-EXPORTAR-CSV-":
            manejar_exportar_csv(gestor, repositorio)

    ventana.close()
