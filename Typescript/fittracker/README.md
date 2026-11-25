# FitTracker

Aplicación educativa con React, TypeScript estricto y Vite para registrar un perfil, organizar ejercicios por día de la semana y consultar estadísticas de entrenamiento.

## Requisitos e instalación

- Node.js compatible con el Vite instalado: `^20.19.0 || >=22.12.0`, según su campo `engines`.
- npm y un navegador moderno.
- Un contexto seguro, como `localhost` o HTTPS, para generar identificadores con `crypto.randomUUID()`.

Desde la carpeta `fittracker`, instala las dependencias registradas en `package-lock.json`:

```bash
npm ci
npm run dev
```

Abre la dirección que indique Vite. No se necesitan claves, variables de entorno ni base de datos.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo. |
| `npm run build` | Ejecuta `tsc -b` y genera la aplicación en `dist/` con Vite. |
| `npm run preview` | Sirve localmente el build generado; requiere ejecutar build antes. |
| `npm run lint` | Revisa el código con ESLint. |

## Funcionalidades implementadas

- Crear y actualizar un perfil con nombre, edad, experiencia, plan Básico o Premium, fecha de inicio y estado de membresía. Actualizarlo conserva su rutina.
- Registrar ejercicios por día: cardio con distancia y zona cardíaca; fuerza con series, repeticiones y peso; flexibilidad con número de poses.
- Consultar el catálogo en orden Cardio, Fuerza y Flexibilidad, con conteos y subtotales de minutos y calorías. Cada entrada cuenta una vez, sin deduplicación por ID; los grupos vacíos permanecen visibles.
- Ver calorías, duración, ritmo de cardio y porcentaje del total por ejercicio, además del promedio por día entrenado, los ejercicios destacados y el día con más calorías.

Primero guarda el perfil para habilitar el registro de ejercicios. Cada registro crea un ejercicio nuevo. Cambiar de categoría conserva los campos comunes y el día, y vacía los campos específicos; un envío correcto limpia el formulario y vuelve a lunes.

Los formularios rechazan nombres vacíos o con solo espacios, campos numéricos vacíos o no finitos y opciones no permitidas. La edad debe ser un entero entre 1 y 120; duración y distancia deben ser positivas; calorías por minuto y peso admiten cero; series, repeticiones y poses deben ser enteros seguros positivos. La zona cardíaca es obligatoria, entre 1 y 5.

La fecha de membresía es obligatoria, se guarda como `YYYY-MM-DD` y admite fechas futuras entre los años 0001 y 9999. El formulario consulta explícitamente la validez del input `date`, aunque usa `noValidate` para mostrar sus propios mensajes de error. No realiza conversiones de zona horaria. Los planes y el estado de membresía no aplican reglas de cobro ni restricciones de acceso.

## Modelo y cálculos

Los modelos están en [src/types/fitness.ts](src/types/fitness.ts), las opciones canónicas en [src/constants/fitness.ts](src/constants/fitness.ts) y las funciones puras en [src/utils](src/utils).

- `Exercise` es una unión discriminada por `category`: TypeScript permite acceder a distancia y zona después de reconocer la variante cardio. La distancia es obligatoria únicamente en esa variante.
- `RoutineEntry` asocia un día con un ejercicio; `WeeklyRoutine` contiene las entradas. `UserProfile` combina información personal, membresía y rutina mediante una intersección de tipos.
- Las tuplas con `as const` definen días, categorías, experiencia, planes y zonas. De ellas se derivan las opciones de los selectores y sus uniones de tipos.
- `ExerciseId`, `UserId` y `RoutineId` son alias de `string`, generados con `crypto.randomUUID()`. Mejoran la lectura, pero TypeScript permite intercambiarlos: no tienen marcas nominales.

| Cálculo | Regla |
| --- | --- |
| Calorías | `durationMinutes * caloriesPerMinute` |
| Ritmo de cardio | `durationMinutes / distanceKm`, redondeado a dos decimales |
| Total de rutina | Suma de calorías de cada entrada |
| Promedio diario | Total dividido entre días distintos con ejercicios; excluye descansos |
| Contribución | `(calories / total) * 100`; cero cuando el total es cero |

`calculatePace` acepta exclusivamente `CardioExercise` y devuelve `undefined` si la distancia o el cociente no permiten un ritmo válido. La interfaz presenta el ritmo con dos decimales. `formatDuration` muestra, por ejemplo, 135 minutos como `2h 15min`, 45 como `45min` y 60 como `1h`.

Una rutina vacía tiene total y promedio cero, sin ejercicios destacados. Los empates conservan la primera aparición. Un día con ejercicios de cero calorías sí cuenta como entrenado.

## Memoria y limitaciones

`App` conserva el perfil y la rutina en el estado de React; los formularios mantienen sus borradores y los resúmenes se derivan de las entradas. **Recargar la página elimina todos los datos.** No hay almacenamiento del navegador, backend ni API externa.

- Solo se gestiona un perfil con una rutina semanal genérica, sin fechas de entrenamiento ni historial.
- No hay edición, eliminación o reutilización de ejercicios existentes.
- Las calorías dependen de la tasa introducida, sin estimación a partir del perfil.
- La precisión de `number` y el redondeo con `toFixed` pueden afectar decimales. No se controlan desbordamientos de productos o totales ante magnitudes extremas.
- El punto de entrada presupone que existe el contenedor HTML `root` mediante una aserción no nula.

## Verificación

Desde la carpeta del proyecto:

```bash
npx tsc --noEmit
npx tsc -p tsconfig.app.json --noEmit
npm run build
npm run lint
git diff --check
```

La configuración raíz usa referencias y no incluye archivos directamente: el primer comando no sustituye la comprobación explícita de `tsconfig.app.json`. El build comprueba ambos proyectos TypeScript. No existe script `test` ni suite automatizada incorporada.

### Lista manual

1. Enviar el perfil vacío y probar nombre con espacios, edad inválida y plan sin elegir. Comprobar fecha vacía, `2023-02-29` inválida, `2024-02-29` válida y una fecha futura. Guardar con ambos planes y comprobar que la fecha conserva su día.
2. Registrar las tres categorías. Probar números vacíos, negativos y conteos fraccionarios; confirmar que peso cero y calorías cero se aceptan. Cambiar de categoría y comprobar conservación de campos comunes y limpieza de los específicos.
3. Registrar cardio de 45 min, 10.4 kcal/min y 5.2 km: debe dar 468 kcal y `8.65 min/km`. Añadir cardio de 60 min, 9 kcal/min y 20 km: debe dar 540 kcal y `3.00 min/km`. Con uno el lunes y otro el miércoles, el total debe ser 1008 kcal y el promedio 504 kcal por día entrenado.
4. Revisar grupos vacíos y conteos de 0, 1 y 2 ejercicios. Actualizar el perfil y comprobar que conserva la rutina.
5. Recorrer controles con Tab, enviar con Enter y revisar una pantalla estrecha. Recargar y comprobar que se eliminan perfil y rutina.
