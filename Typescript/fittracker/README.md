# FitTracker — ejercicios por categoría

Aplicación para registrar un perfil, organizar ejercicios por día de la semana y consultar estadísticas de entrenamiento. La base de Sprint 0 se amplía con categorías de ejercicio y membresía dentro del alcance autorizado. La numeración de esta entrega no determina funcionalidades adicionales.

## Objetivo y funcionalidad implementada

Practicar modelado de datos con TypeScript estricto, funciones puras, estado de React y una interfaz funcional con CSS sencillo.

- Crear y actualizar un perfil con nombre, edad, nivel de experiencia, plan, fecha de inicio y estado de membresía.
- Mantener una rutina semanal asignada al perfil.
- Registrar ejercicios de cardio, fuerza y flexibilidad por día, con campos y validación propios de cada categoría.
- Consultar un catálogo agrupado, subtotales, conteo global y contadores compactos por categoría.
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
# Comprobar la configuración raíz con referencias
npx tsc --noEmit

# Comprobar el código de la aplicación sin emitir JavaScript
npx tsc -p tsconfig.app.json --noEmit

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
│   │   ├── ExerciseCatalog.tsx # Catálogo y contadores por categoría
│   │   └── WorkoutSummary.tsx # Totales y comparación
│   ├── constants/
│   │   └── fitness.ts         # Valores fijos, etiquetas y comprobaciones de selectores
│   ├── types/
│   │   └── fitness.ts         # Modelos del dominio
│   ├── utils/
│   │   ├── calculations.ts    # Funciones puras de rutina
│   │   ├── catalog.ts         # Descripciones, grupos y conteos
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
| `ExerciseBase` | `id: ExerciseId`, `name`, `durationMinutes`, `caloriesPerMinute` |
| `Exercise` | Unión discriminada de `CardioExercise`, `StrengthExercise` y `FlexibilityExercise` |
| `CardioExercise` | `category: "cardio"`, `distanceKm: number`, `heartRateZone: 1, 2, 3, 4 o 5` (más los campos comunes) |
| `StrengthExercise` | `category: "strength"`, `sets`, `repetitionsPerSet`, `weightKg` (más los campos comunes) |
| `FlexibilityExercise` | `category: "flexibility"`, `poseCount` (más los campos comunes) |
| `RoutineEntry` | `day: DayOfWeek`, `exercise: Exercise` |
| `WeeklyRoutine` | `id: RoutineId`, `name: string`, `entries: RoutineEntry[]` |
| `PersonalInfo` | `id: UserId`, `name`, `age`, `experienceLevel: ExperienceLevel` |
| `MembershipInfo` | `membershipPlan`, `membershipStartDate`, `isActive` |
| `UserProfile` | `PersonalInfo & MembershipInfo & { routine: WeeklyRoutine }` |
| `DayOfWeek` | `"monday"`, `"tuesday"`, `"wednesday"`, `"thursday"`, `"friday"`, `"saturday"`, `"sunday"` |

`CaloriesPerMinute` es un alias de `number` que expresa el significado de la tasa calórica. No cambia su representación numérica ni sustituye las validaciones de entrada.

### Identificadores y decisiones confirmadas

`ExerciseId`, `UserId` y `RoutineId` son alias de `string`. Mejoran la legibilidad, pero no establecen separación nominal: TypeScript permite intercambiarlos porque comparten el mismo tipo primitivo. Los identificadores se generan con `crypto.randomUUID()`; actualizar el perfil conserva su identificador y la rutina asignada.

Los tipos definidos por el proyecto, incluidos contratos de componentes, borradores y resultados estadísticos, se centralizan en `src/types/fitness.ts`. Los valores fijos, etiquetas y comprobaciones de pertenencia viven en `src/constants/fitness.ts`; los tipos importan las tuplas mediante `import type`, que se elimina al compilar. Las constantes no importan los modelos, evitando ciclos. La lógica de cálculos permanece en las utilidades.

Las cuatro decisiones siguientes fueron aprobadas expresamente por el usuario en esta conversación:

- Planes permitidos: `basic` y `premium`, mostrados como Básico y Premium. No implican reglas de cobro, vencimiento o permisos.
- Zonas cardíacas: literales numéricos del 1 al 5. El usuario debe seleccionar una zona; no se interpretan como recomendaciones médicas.
- Inicio de membresía: texto obligatorio `YYYY-MM-DD`, con fecha de calendario válida entre los años 0001 y 9999. El input es `date`; la validación comprueba componentes y años bisiestos, sin `Date` ni conversiones horarias. Se muestra el mismo texto guardado.
- Catálogo: derivado de las entradas de rutina, con un ejercicio por ID. Si un ID se repite con datos distintos, prevalece la primera aparición. Las estadísticas de rutina siguen contando cada entrada.

### Nivel de experiencia

```ts
// src/constants/fitness.ts
export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

// src/types/fitness.ts
import type { EXPERIENCE_LEVELS } from '../constants/fitness';
export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];
```

`as const` conserva los valores literales y convierte el arreglo en una tupla de solo lectura para TypeScript. `typeof EXPERIENCE_LEVELS[number]` obtiene la unión de los tipos de sus elementos. La interfaz genera las opciones desde esta tupla y `isExperienceLevel` valida el valor del selector antes de actualizar el estado. Las etiquetas en español se comparten entre el formulario y el perfil.

Días, categorías, planes y zonas siguen el mismo patrón con `DAYS_OF_WEEK`, `EXERCISE_CATEGORIES`, `MEMBERSHIP_PLANS` y `HEART_RATE_ZONES`. Sus uniones se derivan de esas tuplas en el archivo de tipos. Las opciones de los selectores, la comprobación de pertenencia y el orden de grupos reutilizan las mismas listas; las ramas por categoría siguen siendo explícitas. Los componentes importan `DAYS_OF_WEEK` y `dayLabels` directamente de `src/constants/fitness.ts`, sin un módulo intermediario ni un alias adicional. Las etiquetas de experiencia y de plan se comparten entre formulario y perfil, fuera de `components`. `as const` protege los tipos durante la compilación; no congela el arreglo en ejecución.

### Unión discriminada y composición

`category` permite a TypeScript distinguir las tres variantes. Antes de leer distancia o zona se comprueba que el ejercicio es cardio; fuerza y flexibilidad no declaran esas propiedades. La distancia es obligatoria en cardio y no forma parte de la base común. El ritmo se calcula, nunca se guarda.

`UserProfile` usa una intersección para reunir información personal, membresía y rutina. Los borradores de ejercicio también forman una unión: cada categoría conserva únicamente sus campos específicos, como texto mientras se editan los números.

## Estado de React y flujo de registro

`App` mantiene `useState<Profile | null>(null)`. `null` indica que aún no se ha guardado un perfil. La rutina pertenece al perfil y se conserva al actualizar sus datos personales.

Al crear el perfil, el evento de guardado genera una vez el ID del usuario y el ID de su rutina. Las actualizaciones posteriores conservan ambos IDs, la rutina y sus entradas; el actualizador de estado no genera identificadores.

Los formularios mantienen sus borradores, errores y confirmaciones. Los inputs son controlados: reciben el valor del estado y lo actualizan mediante eventos. Los campos numéricos se conservan como `string` durante la edición para permitir valores vacíos; se convierten con `Number` al enviar.

1. Guardar nombre, edad, nivel, plan y fecha válidos, y elegir el estado activo o inactivo.
2. `App` crea una rutina vacía llamada `Rutina semanal` y muestra el formulario de ejercicios.
3. Seleccionar categoría, día e introducir los campos comunes y los propios de esa categoría. El plan y la zona cardíaca comienzan sin selección.
4. El formulario valida y crea una `RoutineEntry`, con un identificador generado por `crypto.randomUUID()`.
5. `App` añade la entrada mediante nuevos objetos y un nuevo arreglo, sin mutar el estado anterior.
6. El formulario se limpia, vuelve a lunes y queda sin categoría; la lista, el catálogo y los resúmenes se recalculan. Cambiar categoría conserva los campos comunes y el día, y elimina campos específicos y errores anteriores.

Los resultados se derivan de la rutina en cada renderizado: no requieren estado adicional, `useEffect` ni `useMemo`.

`ExerciseList` recibe únicamente `ExerciseCalorieContribution[]`: tanto el estado vacío como las filas dependen de `contributions`. Cada contribución incluye su entrada (día y ejercicio), calorías y porcentaje. `WorkoutSummary` conserva la sección y el título de la rutina; las filas utilizan el identificador del ejercicio junto con la posición de la entrada para distinguir apariciones repetidas. Como esta UI solo añade entradas al final y no permite reordenarlas ni eliminarlas, esas claves permanecen estables para las filas existentes. El catálogo usa únicamente el ID, que es único después de deduplicar.

## Fórmulas

| Cálculo | Regla | Función en `calculations.ts` |
| --- | --- | --- |
| Calorías | `durationMinutes * caloriesPerMinute` | `calculateExerciseCalories` |
| Ritmo en min/km | `durationMinutes / distanceKm` | `calculatePace` |
| Total | Suma de calorías de todas las entradas | `calculateRoutineCalories` |
| Promedio | Total / días distintos con entradas | `calculateAverageCaloriesPerTrainedDay` |
| Porcentaje | `(calories / total) * 100`; 0 si el total es 0 | `calculateComparativeSummary` |

El ritmo utiliza `Number(pace.toFixed(2))`; la interfaz lo muestra con dos decimales, por ejemplo `6.00 min/km`. Una distancia ausente, no finita, cero o negativa produce `undefined` y suprime el ritmo. El formulario de cardio exige una distancia válida y rechaza ritmos no finitos. Las otras categorías no tienen ritmo.

### Promedio por días entrenados

Un `Set` cuenta cada día presente en las entradas una sola vez. Los días sin ejercicios no forman parte del divisor. Un día con ejercicios de cero calorías sí cuenta como entrenado.

Ejemplo: dos ejercicios el lunes de 300 y 180 kcal, y uno el miércoles de 120 kcal, suman 600 kcal. Hay dos días entrenados: el promedio es **300 kcal**. No se divide entre tres entradas ni entre siete días.

### Resumen comparativo

`findHighestCalorieDay(routine: WeeklyRoutine): DayCalorieSummary | null` suma las calorías por día mediante `calculateExerciseCalories`. Devuelve `{ day: DayOfWeek, calories: number }`, o `null` cuando no hay entradas. Solo incluye días con ejercicios, incluso si aportan cero calorías. En un empate conserva el día cuya primera entrada aparece antes en la rutina. La interfaz muestra, por ejemplo, `Día con más calorías: Lunes (700 cal)` para dos entradas de 400 y 300 calorías el lunes frente a 600 el miércoles.

`calculateComparativeSummary` identifica el ejercicio de mayor duración y el de más calorías, y devuelve las contribuciones por entrada. Los empates conservan el primero registrado. Las entradas repetidas contribuyen cada vez que aparecen.

Sin ejercicios, total y promedio son 0, los máximos son `null` y las contribuciones son `[]`. Con un total de cero calorías, los porcentajes son 0; los máximos siguen seleccionándose entre los ejercicios existentes.

El resumen devuelve `highestCalorieContribution`, la misma contribución seleccionada de `contributions`, con entrada, calorías y porcentaje; es `null` si la rutina está vacía. El ejercicio seleccionado se obtiene de `highestCalorieContribution.entry.exercise`, sin un campo de compatibilidad duplicado. La interfaz reutiliza estos datos sin recalcular calorías ni porcentajes.

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
| Distancia de cardio | Obligatoria, finita y mayor que cero |
| Zona cardíaca | Selección obligatoria entre 1 y 5 |
| Series, repeticiones y poses | Enteros seguros positivos |
| Peso | Finito y mayor o igual a cero; se admite carga externa cero |
| Plan y fecha | Plan permitido y fecha de calendario obligatorios |
| Calorías y ritmo resultantes | El formulario rechaza productos, total propuesto de rutina y ritmo no finitos antes de guardar |

La validación de entrada se realiza en los formularios, antes de guardar. No se repiten validaciones de nombre, membresía o contadores durante el renderizado. El formulario recibe la rutina actual y valida los datos y resultados antes de llamar a `onAdd`. También evita que el total de minutos deje de ser finito. Los cálculos confían en estos datos validados, sin repetir comprobaciones ni lanzar excepciones por desbordamiento. Al ser no negativas las calorías, un total de rutina finito también protege las sumas diarias. `calculatePace` devuelve `undefined` para otras categorías, distancias ausentes o inválidas y cocientes no finitos. `WorkoutSummary` deriva los resultados directamente y trata explícitamente las rutinas vacías. `formatDuration` mantiene su validación independiente y lanza `RangeError` para valores negativos o no finitos. Se utiliza validación directa, sin framework ni sistema de esquemas. Cualquier futura vía de entrada de datos deberá validar antes de actualizar el estado.

## TypeScript estricto y decisiones técnicas

`strict: true` está activo para `src` en `tsconfig.app.json`. También se detectan variables y parámetros no utilizados. `skipLibCheck: true` omite la revisión interna de declaraciones de dependencias, sin excluir el código de la aplicación.

Sprint 0 exige no usar `any`, `@ts-ignore`, `@ts-nocheck` ni aserciones inseguras para ocultar errores; tipar explícitamente los parámetros y retornos exportados; y comprobar valores opcionales o nulos. El código actual tipa explícitamente parámetros, callbacks, retornos exportados, estados y eventos. La aserción no nula del punto de entrada figura como pendiente en las limitaciones.

| Decisión | Justificación |
| --- | --- |
| Interfaces y uniones | Describen los datos y restringen opciones como experiencia y día |
| Funciones puras fuera de React | Permiten revisar cálculos sin depender de la interfaz |
| Estado compartido en `App` y borradores locales | Separan los datos guardados de la edición pendiente |
| Actualizaciones inmutables | Conservan el estado anterior y permiten detectar cambios |
| `Omit`, `Partial` y `Record` | Derivan tipos existentes y evitan repetir contratos |
| `ChangeEvent` y `FormEvent` | Tipan los elementos y operaciones de los eventos |
| CSS sencillo y validación directa | Mantienen el alcance educativo sin infraestructura adicional |

## Memoria y ausencia de persistencia

Todos los datos de la aplicación viven en el estado de React. Recargar elimina el perfil y la rutina. No se utilizan `localStorage`, `sessionStorage`, IndexedDB, backend, base de datos ni API externa. El servidor de Vite sirve la interfaz; no es un backend del dominio.

## Verificación manual de referencia

No hay script `test` ni suite automatizada incorporada. Estos pasos complementan las comprobaciones ejecutadas. La auditoría de categorías dejó pendiente su ejecución en navegador; la revisión posterior de espaciado verificó los estados y tamaños indicados al final de este documento, sin repetir toda la auditoría funcional:

1. Enviar perfil vacío; probar edad inválida, plan sin elegir y fecha inválida. Guardar ambos planes y ambos estados de membresía.
2. Confirmar que la fecha guardada se muestra sin cambiar de día.
3. Enviar ejercicio sin categoría y cardio sin zona; comprobar errores asociados a los controles.
4. Registrar Running, Cycling, Bench Press y Yoga Flow usando los datos de la tabla de verificación inferior.
5. Cambiar cardio → fuerza → flexibilidad → cardio: conservar campos comunes y día, vaciar campos específicos y eliminar errores anteriores.
6. Probar nombres vacíos, números negativos, fracciones en contadores y valores extremos. Peso cero y calorías cero deben aceptarse.
7. Comprobar actualización inmediata de catálogo, contadores y estadísticas de rutina; actualizar el perfil y conservar la rutina.
8. Comprobar catálogo vacío y categorías vacías. Recargar debe eliminar los datos en memoria.
9. Recorrer controles con Tab y enviar con Enter; comprobar escritorio y una pantalla de 320 px.

## Limitaciones conocidas

- La precisión binaria de `number` afecta algunos decimales: `formatDuration(60.1)` devuelve `1h 0.10000000000000142min`.
- El ritmo usa `toFixed`: 1.005 min y 1 km producen 1, mostrado como `1.00`, en lugar de 1.01 bajo un criterio decimal de redondeo hacia arriba en el punto medio. Debe definirse ese criterio antes de corregirlo.
- `src/main.tsx` utiliza `document.getElementById('root')!`: supone que el contenedor existe sin comprobarlo en ejecución.
- No hay edición o eliminación de ejercicios, historial por fecha, gestión de varios perfiles ni configuración de varias rutinas.
- Los días representan una semana genérica, sin fechas ni semanas de calendario.
- Las calorías usan la tasa introducida; no se estiman mediante los datos del perfil.
- La validación es básica y no hay una suite automatizada persistida en el proyecto.

## Catálogo y contadores bonus

La fuente de verdad es `profile.routine.entries`, propiedad de `App`. No existe un segundo estado de catálogo. `summarizeCatalog` crea grupos nuevos en orden Cardio, Fuerza y Flexibilidad, con `exercises`, `count`, `minutes` y `calories`. Un `Set<ExerciseId>` incluye únicamente la primera aparición de cada ID. `countCatalogExercises` suma los conteos de esos grupos. Las entradas y los ejercicios recibidos no se modifican.

`ExerciseCatalog` recibe únicamente `entries`, no el resto de la rutina, y utiliza el mismo resumen para sus subtotales, el total global y los tres contadores compactos. La inicialización de grupos recorre `EXERCISE_CATEGORIES`, por lo que comparte orden y valores con el selector. Los grupos vacíos permanecen visibles con valores cero. `describeExercise` muestra duración, calorías y los detalles de cada variante, incluida la zona cardíaca y el ritmo con dos decimales para cardio. Su comprobación exhaustiva con `never` obliga a actualizar la función si se añade una variante al modelo.

Las estadísticas de rutina conservan su propia semántica: cuentan cada entrada. Dos apariciones del mismo Running producen 936 kcal en la rutina y 468 kcal en el catálogo. Si el segundo objeto tiene el mismo ID pero otros datos, el catálogo conserva el primero; la rutina utiliza los datos de cada entrada. La UI actual genera un nuevo ID por registro y no ofrece reutilización ni edición de ejercicios existentes.

Los cálculos de categoría son suma de duraciones y suma de `durationMinutes * caloriesPerMinute` de los ejercicios únicos. Los contadores representan ejercicios únicos, no días ni entradas. No se guardan grupos, descripciones, ritmo o totales en estado ni se utilizan efectos para derivarlos.

## Verificación ejecutada

Las comprobaciones se ejecutaron sobre el código de esta entrega, sin añadir dependencias ni sembrar el estado de producción.

| Ejercicio temporal | Datos específicos | Resultado |
| --- | --- | --- |
| Running | 45 min, 10.4 kcal/min, 5.2 km, zona 2 | 468 kcal, `8.65` min/km |
| Cycling | 60 min, 9 kcal/min, 20 km, zona 3 | 540 kcal, `3.00` min/km |
| Bench Press | 30 min, 10 kcal/min, 4 series, 10 repeticiones, 60 kg | 300 kcal |
| Yoga Flow | 40 min, 4 kcal/min, 12 poses | 160 kcal |

Los grupos producen Cardio: 2 ejercicios, 105 min y 1008 kcal; Fuerza: 1, 30 min y 300 kcal; Flexibilidad: 1, 40 min y 160 kcal. El conteo global es 4. Repartidos en dos días, la rutina suma 1468 kcal y promedia 734 kcal por día entrenado.

- Pasaron 50 aserciones temporales con Node y TypeScript sobre funciones puras: ejemplo completo, vacíos, una categoría, cero calorías, primera aparición de IDs repetidos, ausencia de mutación, duración, promedios, porcentajes, empates y ritmo inválido. Se conservó el redondeo existente.
- Pasaron 74 aserciones de componentes/callbacks con hooks simulados: las tres rutas de registro, objetos sin campos sobrantes, selección obligatoria, valores de selector inválidos, limpieza al cambiar categoría, peso cero, campos inválidos, fechas bisiestas y límites, ambos planes y estados, conservación de IDs y rutina, detalles y contadores. Un montaje nuevo comienza sin perfil; esto no es una prueba real de recarga de navegador.
- El compilador rechazó experiencia, plan y zona inválidos (tres errores TS2322), y accesos a propiedades de otras variantes (tres TS2339) en un archivo temporal eliminado después. La salida esperada fue 2, sin directivas de supresión.
- Pasaron las validaciones finales: `npx tsc --noEmit`, `npx tsc -p tsconfig.app.json --noEmit`, `npm run build`, `npm run lint` y `git diff --check`, después de eliminar el archivo temporal. No existe script `test`.

Durante la auditoría de categorías, el acceso al navegador devolvió `The browser access host is unavailable` y no se verificaron interacciones reales, navegación por teclado, recarga ni diseño de escritorio/pantalla estrecha. La revisión posterior de espaciado consiguió acceso nativo a Chrome y sus resultados se detallan más abajo. El CSS incorpora contadores que se ajustan en varias líneas, ajuste de palabras largas y menor espaciado en pantallas estrechas; esas propiedades fueron inspeccionadas en código.

La entrega implementa el alcance descrito. La verificación manual de navegador sigue pendiente por la limitación del entorno. No se implementaron interfaces de comportamiento, clases, persistencia, backend ni reglas de facturación, y no se considera resuelta la numeración de futuros sprints.

## Resultado de la auditoría final

Se volvió a inspeccionar el código y el diff y se repitieron las comprobaciones, sin tomar los informes anteriores como prueba. No se detectaron funciones obligatorias ausentes ni defectos nuevos de esta entrega que requirieran cambiar el código. Se actualizó esta documentación. El cierre de la verificación funcional sigue pendiente de navegador.

| Requisito | Implementación | Evidencia de esta auditoría | Estado |
| --- | --- | --- | --- |
| Tres variantes, campos exclusivos y narrowing | `types/fitness.ts`, `utils/calculations.ts`, componentes | Inspección y tres TS2339 esperados | Verificado |
| Experiencia, planes y zonas restringidos | `types/fitness.ts`, formularios | Tres TS2322 esperados y callbacks de selectores | Verificado |
| Alias de IDs y composición por intersección | `types/fitness.ts`, `App.tsx` | Tipos y conservación de IDs en callbacks | Verificado |
| Tipos separados, parámetros y retornos explícitos, imports sin ciclos | Los 14 archivos TS/TSX de `src` | Recorrido del AST e inspección del grafo local; cero incidencias nuevas | Verificado |
| Ausencia de aserciones inseguras en todo el código | `main.tsx` y resto de `src` | Sin `any` ni supresiones; persiste `!` preexistente en el contenedor raíz | Parcialmente verificado |
| Registro, cambio de categoría y validación | `ExerciseForm.tsx` | Objetos de cada variante y limpieza comprobados mediante callbacks simulados | Parcialmente verificado |
| Membresía, fecha y conservación de rutina | `UserForm.tsx`, `UserProfile.tsx`, `App.tsx` | Ambos planes/estados, fechas límite y actualización comprobados mediante callbacks simulados | Parcialmente verificado |
| Descripciones exhaustivas y zona visible | `utils/catalog.ts` | `never`, textos y ritmos del ejemplo | Verificado |
| Catálogo, subtotales, conteos y bonus | `utils/catalog.ts`, `ExerciseCatalog.tsx` | Ejemplo, vacíos, cero calorías e IDs repetidos | Verificado |
| Estadísticas previas de rutina | `utils/calculations.ts`, `utils/formatters.ts` | Promedios, máximos, porcentajes, empates, duración y ritmo inválido | Verificado |
| Estado en memoria, actualizaciones inmutables y valores derivados | `App.tsx` y componentes | Inspección y callbacks; sin efectos ni segundo estado de catálogo | Verificado |
| Recarga real, teclado y diseño en escritorio/320 px | Aplicación en navegador | Servicio de navegador inaccesible | Pendiente |

En esta auditoría pasaron nuevamente las 50 comprobaciones numéricas/de catálogo y las 74 de componentes/callbacks con hooks simulados. Se verificó por separado el AST de los 14 archivos TS/TSX y sus importaciones locales: no hay tipos fuera de `fitness.ts`, parámetros sin anotar, retornos exportados sin anotar, tipos `any`, supresiones ni ciclos. `step="any"` permanece como atributo HTML válido. La única aserción no nula detectada es la limitación previa documentada de `main.tsx`.

La prueba temporal de rechazo del compilador devolvió los seis errores esperados y salida 2; se eliminó su archivo antes de repetir compilación limpia. `npx tsc --noEmit`, `npx tsc -p tsconfig.app.json --noEmit`, `npm run build` y `npm run lint` terminaron con salida 0. No hay script de pruebas para ejecutar. Se revisó también `git diff --check`.

No se cambiaron fórmulas ni criterios de redondeo. Las limitaciones previas de precisión decimal y la suposición del contenedor raíz se mantienen fuera de esta entrega. El siguiente paso es ejecutar la lista manual en un navegador disponible; las pruebas simuladas no sustituyen interacción real ni verificación visual.

## Revisión posterior de espaciado

Se unificó el espaciado conservando colores, tipografía y contenedores existentes. La escala CSS usa 0.25, 0.5, 1 y 1.5 rem (4, 8, 16 y 24 px con el tamaño de texto inicial): 4 px dentro de los campos, 16 px entre campos y bloques, y 24 px entre secciones. Etiqueta, control y error comparten `.form-field`; la casilla y su etiqueta comparten fila. Se eliminaron márgenes predeterminados superpuestos y se definió separación intencional para títulos, listas, definiciones y entradas de rutina.

Se inspeccionaron capturas reales en Chrome nativo, usando una pestaña local separada y datos sintéticos:

- Comparación antes/después a 390 px; estado inicial, errores de usuario, perfil guardado y mensajes de confirmación.
- Campos y errores de cardio, fuerza y flexibilidad; registro de las tres categorías, incluido un nombre largo; envío de flexibilidad con Tab y Enter.
- Catálogo poblado y resúmenes a 1440, 768, 390 y 320 px. Los contadores pasan a dos filas a 320 px. No se observaron desbordamientos horizontales ni superposiciones en las vistas inspeccionadas.
- Controles del perfil vacío a 320 px y lectura de la rutina con zoom de escritorio al 150 %. La recarga eliminó los datos de prueba y se restauró el zoom al 100 %.

No se probaron todas las combinaciones de estado y ancho, otros navegadores, zoom al 200 % ni ampliación exclusiva de texto. Los resultados visuales se limitan a las vistas inspeccionadas. La lógica de dominio, validaciones, callbacks y estado se compararon con una copia previa y permanecen iguales; solo se modificaron CSS, contenedores y clases JSX de presentación. Las compilaciones de TypeScript, build, lint y `git diff --check` pasaron tras los cambios.
