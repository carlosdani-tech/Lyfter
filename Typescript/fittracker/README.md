# FitTracker — Sprint 0

Aplicación para registrar un perfil, organizar ejercicios por día de la semana y consultar estadísticas de entrenamiento. El proyecto contempla cinco sprints; la funcionalidad actual corresponde a **Sprint 0**.

## Objetivo y funcionalidad implementada

Practicar modelado de datos con TypeScript estricto, funciones puras, estado de React y una interfaz funcional con CSS sencillo.

- Crear y actualizar un perfil con nombre, edad y nivel de experiencia.
- Mantener una rutina semanal asignada al perfil.
- Registrar varios ejercicios por día con distancia opcional.
- Mostrar duración, calorías, ritmo y contribución porcentual.
- Consultar totales, promedio por días entrenados y ejercicios destacados.
- Validar entradas y mostrar mensajes para errores y rutinas vacías.

## Tecnologías

| Tecnología | Uso |
| --- | --- |
| React 19 y React DOM | Componentes funcionales, formularios y hooks |
| TypeScript 5.9 | Modelos y comprobación estática estricta |
| Vite 8 | Desarrollo y generación del build |
| CSS | Presentación sin biblioteca de componentes |
| ESLint | Revisión estática y reglas de React |

Los rangos de versiones están en `package.json`; `package-lock.json` registra las versiones resueltas.

## Requisitos e instalación

- Node.js compatible con el Vite instalado: `^20.19.0 || >=22.12.0`.
- npm disponible en la terminal.
- Navegador moderno. El registro utiliza `crypto.randomUUID()`, que requiere un contexto seguro, como `localhost` o HTTPS.

Desde la carpeta del proyecto:

```bash
npm install
npm run dev
```

Abrir la dirección indicada por Vite. No se requieren base de datos, claves ni variables de entorno para la funcionalidad actual.

En Windows, si PowerShell bloquea los lanzadores `.ps1`, utilizar `npm.cmd` y `npx.cmd` en los mismos comandos.

## TypeScript, compilación y revisión

```bash
# Comprobar el código de la aplicación sin emitir JavaScript
npx tsc --project tsconfig.app.json --noEmit

# Comprobar los proyectos TypeScript y generar dist/
npm run build

# Revisar reglas de código
npm run lint

# Servir localmente el build ya generado
npm run preview
```

`tsconfig.json` contiene `files: []` y referencias a `tsconfig.app.json` y `tsconfig.node.json`. Por ello, `npx tsc --noEmit` sobre la raíz no sustituye la comprobación explícita de la aplicación. El script `build` ejecuta `tsc -b && vite build`: Vite solo se ejecuta si TypeScript termina correctamente.

## Estructura del proyecto

```text
fittracker/
├── src/
│   ├── components/
│   │   ├── UserForm.tsx        # Edición y validación del perfil
│   │   ├── UserProfile.tsx     # Perfil guardado
│   │   ├── ExerciseForm.tsx    # Registro de ejercicios
│   │   ├── ExerciseList.tsx    # Lista y estadísticas por entrada
│   │   ├── WorkoutSummary.tsx # Totales y comparación
│   │   └── experienceLevels.ts # Etiquetas de experiencia
│   ├── constants/
│   │   └── weekdays.ts        # Etiquetas de días y referencia a la tupla canónica
│   ├── types/
│   │   └── fitness.ts         # Modelos del dominio
│   ├── utils/
│   │   ├── calculations.ts    # Funciones puras
│   │   └── formatters.ts      # Formato de duración
│   ├── App.tsx                # Estado compartido
│   ├── main.tsx               # Entrada de React
│   └── index.css
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── eslint.config.js
```

## Modelos del dominio

Definidos en `src/types/fitness.ts`:

| Modelo | Campos o valores |
| --- | --- |
| `Exercise` | `id: string`, `name: string`, `durationMinutes: number`, `caloriesPerMinute: CaloriesPerMinute`, `distanceKm?: number` |
| `RoutineEntry` | `day: DayOfWeek`, `exercise: Exercise` |
| `WeeklyRoutine` | `name: string`, `entries: RoutineEntry[]` |
| `UserProfile` | `name: string`, `age: number`, `experienceLevel: ExperienceLevel`, `routine: WeeklyRoutine` |
| `DayOfWeek` | `"monday"`, `"tuesday"`, `"wednesday"`, `"thursday"`, `"friday"`, `"saturday"`, `"sunday"` |

`CaloriesPerMinute` es un alias de `number` que expresa el significado de la tasa calórica. No cambia su representación numérica ni sustituye las validaciones de entrada.

### Nivel de experiencia

```ts
export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];
```

`as const` conserva los valores literales y convierte el arreglo en una tupla de solo lectura para TypeScript. `typeof EXPERIENCE_LEVELS[number]` obtiene la unión de los tipos de sus elementos. La interfaz genera las opciones desde esta tupla y `isExperienceLevel` valida el valor del selector antes de actualizar el estado. Las etiquetas en español se comparten entre el formulario y el perfil.

Los días siguen el mismo patrón con `DAYS_OF_WEEK` y `type DayOfWeek = typeof DAYS_OF_WEEK[number]`. `src/constants/weekdays.ts` conserva el mapa tipado de etiquetas y exporta `days` como referencia a la tupla canónica, sin copiar la lista de identificadores. Los componentes consumen estas constantes; el módulo de tipos no depende de ellas. `as const` protege los tipos durante la compilación; no congela el arreglo en ejecución.

### Distancia opcional

```ts
distanceKm?: number;
```

El signo `?` permite omitir la propiedad. Su lectura puede producir `number` o `undefined`, por lo que se comprueba antes de calcular el ritmo. Si el campo queda vacío, el formulario omite la propiedad al construir el ejercicio.

## Estado de React y flujo de registro

`App` mantiene `useState<Profile | null>(null)`. `null` indica que aún no se ha guardado un perfil. La rutina pertenece al perfil y se conserva al actualizar sus datos personales.

Los formularios mantienen sus borradores, errores y confirmaciones. Los inputs son controlados: reciben el valor del estado y lo actualizan mediante eventos. Los campos numéricos se conservan como `string` durante la edición para permitir valores vacíos; se convierten con `Number` al enviar.

1. Guardar nombre, edad y nivel válidos.
2. `App` crea una rutina vacía llamada `Rutina semanal` y muestra el formulario de ejercicios.
3. Elegir día e introducir nombre, duración, calorías por minuto y distancia opcional.
4. El formulario valida y crea una `RoutineEntry`, con un identificador generado por `crypto.randomUUID()`.
5. `App` añade la entrada mediante nuevos objetos y un nuevo arreglo, sin mutar el estado anterior.
6. El formulario se limpia y vuelve a lunes; la lista y el resumen se recalculan.

Los resultados se derivan de la rutina en cada renderizado: no requieren estado adicional, `useEffect` ni `useMemo`.

`ExerciseList` recibe únicamente `ExerciseCalorieContribution[]`: tanto el estado vacío como las filas dependen de `contributions`. Cada contribución incluye su entrada (día y ejercicio), calorías y porcentaje. `WorkoutSummary` conserva la sección y el título de la rutina; las filas utilizan el identificador del ejercicio como clave estable, generado al registrarlo.

## Fórmulas

| Cálculo | Regla | Función en `calculations.ts` |
| --- | --- | --- |
| Calorías | `durationMinutes * caloriesPerMinute` | `calculateExerciseCalories` |
| Ritmo en min/km | `durationMinutes / distanceKm` | `calculatePace` |
| Total | Suma de calorías de todas las entradas | `calculateRoutineCalories` |
| Promedio | Total / días distintos con entradas | `calculateAverageCaloriesPerTrainedDay` |
| Porcentaje | `(calories / total) * 100`; 0 si el total es 0 | `calculateComparativeSummary` |

El ritmo utiliza `Number(pace.toFixed(2))`; la interfaz lo muestra con dos decimales, por ejemplo `6.00 min/km`. Una distancia ausente, no finita, cero o negativa produce `undefined` y suprime el ritmo. El formulario rechaza las distancias inválidas proporcionadas.

### Promedio por días entrenados

Un `Set` cuenta cada día presente en las entradas una sola vez. Los días sin ejercicios no forman parte del divisor. Un día con ejercicios de cero calorías sí cuenta como entrenado.

Ejemplo: dos ejercicios el lunes de 300 y 180 kcal, y uno el miércoles de 120 kcal, suman 600 kcal. Hay dos días entrenados: el promedio es **300 kcal**. No se divide entre tres entradas ni entre siete días.

### Resumen comparativo

`findHighestCalorieDay(routine: WeeklyRoutine): DayCalorieSummary | null` suma las calorías por día mediante `calculateExerciseCalories`. Devuelve `{ day: DayOfWeek, calories: number }`, o `null` cuando no hay entradas. Solo incluye días con ejercicios, incluso si aportan cero calorías. En un empate conserva el día cuya primera entrada aparece antes en la rutina. La interfaz muestra, por ejemplo, `Día con más calorías: Lunes (700 cal)` para dos entradas de 400 y 300 calorías el lunes frente a 600 el miércoles.

`calculateComparativeSummary` identifica el ejercicio de mayor duración y el de más calorías, y devuelve las contribuciones por entrada. Los empates conservan el primero registrado. Las entradas repetidas contribuyen cada vez que aparecen.

Sin ejercicios, total y promedio son 0, los máximos son `null` y las contribuciones son `[]`. Con un total de cero calorías, los porcentajes son 0; los máximos siguen seleccionándose entre los ejercicios existentes.

El resumen devuelve `highestCalorieContribution`, la misma contribución seleccionada de `contributions`, con entrada, calorías y porcentaje; es `null` si la rutina está vacía. Conserva `highestCalorieExercise` por compatibilidad. La interfaz reutiliza estos datos sin recalcular calorías ni porcentajes.

La interfaz muestra calorías con hasta dos decimales. El destacado de más calorías redondea el porcentaje a un entero: `Swimming (720 cal, 48% del total)` para una rutina de 1488 calorías. La lista conserva los porcentajes con dos decimales. Los porcentajes mostrados pueden no sumar exactamente 100 % por el redondeo individual.

### Formato de duración

`formatDuration`, en `formatters.ts`, separa horas completas y minutos restantes.

| Minutos | Resultado |
| --- | --- |
| 135 | `2h 15min` |
| 45 | `45min` |
| 60 | `1h` |
| 0 | `0min` |
| 90.5 | `1h 30.5min` |

El formateador admite cero; el registro requiere una duración mayor que cero. Las fracciones se conservan con las limitaciones de precisión descritas más adelante.

## Comprobaciones en ejecución

TypeScript no valida por sí solo los datos introducidos. Además, un `number` puede contener `NaN` o `Infinity`, por lo que se realizan comprobaciones explícitas.

| Dato | Comprobación implementada |
| --- | --- |
| Nombre | Obligatorio, sin aceptar solo espacios; se guarda con `trim()` |
| Edad | Entero entre 1 y 120 |
| Experiencia y día | Valores contrastados con las opciones permitidas |
| Duración | Finita y mayor que cero |
| Calorías por minuto | Finitas y mayores o iguales a cero |
| Distancia | Opcional; si se proporciona, finita y mayor que cero |
| Calorías y ritmo resultantes | El formulario rechaza productos, total propuesto de rutina y ritmo no finitos antes de guardar |

El formulario recibe la rutina actual y valida los datos y resultados antes de llamar a `onAdd`. Los cálculos confían en estos datos validados, sin repetir comprobaciones ni lanzar excepciones por desbordamiento. Al ser no negativas las calorías, un total de rutina finito también protege las sumas diarias. `calculatePace` conserva `undefined` ante distancias ausentes o inválidas. `WorkoutSummary` deriva los resultados directamente y trata explícitamente las rutinas vacías. `formatDuration` mantiene su validación independiente y lanza `RangeError` para valores negativos o no finitos. Se utiliza validación directa, sin framework ni sistema de esquemas. Cualquier futura vía de entrada de datos deberá validar antes de actualizar el estado.

## TypeScript estricto y decisiones técnicas

`strict: true` está activo para `src` en `tsconfig.app.json`. También se detectan variables y parámetros no utilizados. `skipLibCheck: true` omite la revisión interna de declaraciones de dependencias, sin excluir el código de la aplicación.

Sprint 0 exige no usar `any`, `@ts-ignore`, `@ts-nocheck` ni aserciones inseguras para ocultar errores; tipar explícitamente los parámetros y retornos exportados; y comprobar valores opcionales o nulos. El código actual tipa explícitamente parámetros, callbacks, retornos exportados, estados y eventos. La aserción no nula del punto de entrada figura como pendiente en las limitaciones.

| Decisión | Justificación |
| --- | --- |
| Interfaces y uniones | Describen los datos y restringen opciones como experiencia y día |
| Funciones puras fuera de React | Permiten revisar cálculos sin depender de la interfaz |
| Estado compartido en `App` y borradores locales | Separan los datos guardados de la edición pendiente |
| Actualizaciones inmutables | Conservan el estado anterior y permiten detectar cambios |
| `Omit`, `Partial`, `Record` y `ReturnType` | Derivan tipos existentes y evitan repetir contratos |
| `ChangeEvent` y `FormEvent` | Tipan los elementos y operaciones de los eventos |
| CSS sencillo y validación directa | Mantienen el alcance educativo sin infraestructura adicional |

## Memoria y ausencia de persistencia

Todos los datos de la aplicación viven en el estado de React. Recargar elimina el perfil y la rutina. No se utilizan `localStorage`, `sessionStorage`, IndexedDB, backend, base de datos ni API externa. El servidor de Vite sirve la interfaz; no es un backend del dominio.

## Verificación manual

No hay script `test` ni suite automatizada incorporada. TypeScript, build y lint comprueban aspectos distintos y no sustituyen las pruebas de comportamiento.

1. Enviar el perfil vacío y con nombre de solo espacios: deben aparecer errores.
2. Probar edades 0, 2.5 y 121; guardar una válida y comprobar los tres niveles.
3. Registrar 45 min a 5 kcal/min sin distancia: `45min`, 225 kcal y sin ritmo.
4. Registrar 60 min a 0 kcal/min con 10 km: `1h`, 0 kcal y `6.00 min/km`.
5. Registrar 135 min con 20 km: `2h 15min` y `6.75 min/km`.
6. Usar el ejemplo de 600 kcal: promedio 300 y porcentajes 50 %, 30 % y 20 %.
7. Comprobar empates, rutina vacía y total cero.
8. Probar números negativos, distancia cero y valores extremos: rechazar entradas inválidas o desbordadas.
9. Actualizar el perfil: conservar rutina. Recargar: eliminar ambos.
10. Recorrer los formularios con Tab y enviarlos con Enter.

## Limitaciones conocidas

- La precisión binaria de `number` afecta algunos decimales: `formatDuration(60.1)` devuelve `1h 0.10000000000000142min`.
- El ritmo usa `toFixed`: 1.005 min y 1 km producen 1, mostrado como `1.00`, en lugar de 1.01 bajo un criterio decimal de redondeo hacia arriba en el punto medio. Debe definirse ese criterio antes de corregirlo.
- `src/main.tsx` utiliza `document.getElementById('root')!`: supone que el contenedor existe sin comprobarlo en ejecución.
- No hay edición o eliminación de ejercicios, historial por fecha, gestión de varios perfiles ni configuración de varias rutinas.
- Los días representan una semana genérica, sin fechas ni semanas de calendario.
- Las calorías usan la tasa introducida; no se estiman mediante los datos del perfil.
- La validación es básica y no hay una suite automatizada persistida en el proyecto.

## Roadmap: Sprints 1–4

Los requisitos disponibles no definen el contenido de los siguientes sprints. Esta tabla registra su estado sin atribuirles funcionalidades no confirmadas.

| Sprint | Estado | Próximo hito de planificación |
| --- | --- | --- |
| 0 | Funcionalidad descrita implementada, con las limitaciones anteriores | Revisar precisión decimal y comprobación del contenedor raíz |
| 1 | Futuro; alcance pendiente de definición | Acordar requisitos y criterios de aceptación |
| 2 | Futuro; alcance pendiente de definición | Definir objetivos tras confirmar el alcance anterior |
| 3 | Futuro; alcance pendiente de definición | Definir objetivos y dependencias |
| 4 | Futuro; alcance pendiente de definición | Definir objetivos y criterios de entrega final |

El roadmap no afirma que persistencia, backend, autenticación u otras ampliaciones estén implementadas ni asignadas a un sprint concreto.
