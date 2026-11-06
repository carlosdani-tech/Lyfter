import type { JSX } from 'react'
import type { WeeklyRoutine } from '../types/fitness'
import {
  calculateRoutineCalories,
  calculateAverageCaloriesPerTrainedDay,
  calculateComparativeSummary,
  calculateExerciseCalories,
} from '../utils/calculations'
import { formatDuration } from '../utils/formatters'
import ExerciseList from './ExerciseList'

interface WorkoutSummaryProps {
  routine: WeeklyRoutine
}

export default function WorkoutSummary({ routine }: WorkoutSummaryProps): JSX.Element {
  // A routine total can overflow even when each individual exercise is valid.
  let total: number
  let average: number
  let summary: ReturnType<typeof calculateComparativeSummary>
  try {
    total = calculateRoutineCalories(routine)
    average = calculateAverageCaloriesPerTrainedDay(routine)
    summary = calculateComparativeSummary(routine)
  } catch (error: unknown) {
    if (!(error instanceof RangeError)) throw error
    return <p role="alert">No se puede calcular el resumen: los valores de la rutina exceden el rango numérico permitido.</p>
  }

  const longest = summary.longestExercise
  const highestCalorie = summary.highestCalorieExercise

  return (
    <>
      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading">Resumen de entrenamiento</h2>
        <dl>
          <dt>Calorías totales de la rutina</dt>
          <dd>{total.toLocaleString('es', { maximumFractionDigits: 2 })} kcal</dd>
          <dt>Promedio de calorías por día entrenado</dt>
          <dd>{average.toLocaleString('es', { maximumFractionDigits: 2 })} kcal</dd>
          <dt>Ejercicio de mayor duración</dt>
          <dd>{longest === null ? 'Sin ejercicios todavía.' : `${longest.name} (${formatDuration(longest.durationMinutes)})`}</dd>
          <dt>Ejercicio con más calorías</dt>
          <dd>{highestCalorie === null ? 'Sin ejercicios todavía.' : `${highestCalorie.name} (${calculateExerciseCalories(highestCalorie).toLocaleString('es', { maximumFractionDigits: 2 })} kcal)`}</dd>
        </dl>
        <p>El promedio cuenta solo días con ejercicios. En caso de empate, se muestra el primero registrado.</p>
      </section>
      <ExerciseList routine={routine} contributions={summary.contributions} />
    </>
  )
}
