# Gestor de Finanzas Personales

Aplicacion de escritorio hecha con FreeSimpleGUI para registrar categorias, ingresos y gastos.

## Estructura

- `main.py`: punto de entrada.
- `interfaces.py`: interfaz grafica y manejo de eventos.
- `logic.py`: reglas del negocio.
- `models.py`: clases del dominio.
- `persistencia.py`: carga y guardado en JSON.
- `validators.py`: validaciones reutilizables.
- `tests/test_logic.py`: pruebas unitarias.

## Ejecucion

```bash
pip install -r requirements.txt
python main.py
```

## Pruebas

```bash
python -m pytest -v
```
