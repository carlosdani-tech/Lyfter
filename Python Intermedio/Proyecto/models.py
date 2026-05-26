from dataclasses import dataclass

from validators import fecha_hoy_texto


@dataclass
class Categoria:
    nombre: str
    color: str = "#FFFFFF"

    def to_dict(self) -> dict:
        return {"nombre": self.nombre, "color": self.color}

    @staticmethod
    def from_dict(data: dict) -> "Categoria":
        return Categoria(data["nombre"], data.get("color", "#FFFFFF"))


@dataclass
class Movimiento:
    titulo: str
    monto: float
    categoria: str
    tipo: str
    fecha: str

    def to_dict(self) -> dict:
        return {
            "titulo": self.titulo,
            "monto": self.monto,
            "categoria": self.categoria,
            "tipo": self.tipo,
            "fecha": self.fecha,
        }

    @staticmethod
    def from_dict(data: dict) -> "Movimiento":
        return Movimiento(
            data["titulo"],
            float(data["monto"]),
            data["categoria"],
            data["tipo"],
            data.get("fecha", fecha_hoy_texto()),
        )
