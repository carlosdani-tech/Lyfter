import csv
import json
from pathlib import Path

from logic import GestorFinanzas


RUTA_DATOS_PREDETERMINADA = Path(__file__).resolve().parent / "data" / "finanzas.json"


class RepositorioFinanzas:
    def __init__(self, ruta_archivo: str | Path = RUTA_DATOS_PREDETERMINADA) -> None:
        self.ruta_archivo = Path(ruta_archivo)

    def cargar(self) -> GestorFinanzas:
        if not self.ruta_archivo.exists():
            return GestorFinanzas()

        with self.ruta_archivo.open("r", encoding="utf-8") as archivo:
            datos = json.load(archivo)
        return GestorFinanzas.desde_dict(datos)

    def guardar(self, gestor: GestorFinanzas) -> None:
        self.ruta_archivo.parent.mkdir(parents=True, exist_ok=True)
        with self.ruta_archivo.open("w", encoding="utf-8") as archivo:
            json.dump(gestor.exportar_datos(), archivo, indent=4, ensure_ascii=False)

    def exportar_csv(self, gestor: GestorFinanzas, ruta_archivo: str | Path) -> Path:
        ruta = Path(ruta_archivo)
        ruta.parent.mkdir(parents=True, exist_ok=True)
        resumen = gestor.resumen_para_csv()

        with ruta.open("w", encoding="utf-8-sig", newline="") as archivo:
            writer = csv.writer(archivo)
            writer.writerow(["Fecha", "Titulo", "Monto", "Categoria", "Tipo"])
            writer.writerows(gestor.movimientos_para_csv())
            writer.writerow([])
            writer.writerow(["Totales:"])
            for linea in resumen:
                writer.writerow([linea])

        return ruta
