import type { JSX } from 'react'
import type { WeeklyRoutine } from '../types/fitness'
import {
  calculateRoutineCalories,
  calculateAverageCaloriesPerTrainedDay,
  calculateComparativeSummary,
  findHighestCalorieDay,
} from '../utils/calculations'
import { formatDuration } from '../utils/formatters'
import ExerciseList from './ExerciseList'
import { dayLabels } from '../constants/weekdays'

interface WorkoutSummaryProps {
  routine: WeeklyRoutine
}

export default function WorkoutSummary({ routine }: WorkoutSummaryProps): JSX.Element {
  const total = calculateRoutineCalories(routine)
  const average = calculateAverageCaloriesPerTrainedDay(routine)
  const summary = calculateComparativeSummary(routine)
  const highestDay = findHighestCalorieDay(routine)

  const longest = summary.longestExercise
  const highestCalorie = summary.highestCalorieContribution

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
          <dd>{highestCalorie === null ? 'Sin ejercicios todavía.' : `${highestCalorie.entry.exercise.name} (${highestCalorie.calories.toLocaleString('es', { maximumFractionDigits: 2 })} cal, ${highestCalorie.percentage.toFixed(0)}% del total)`}</dd>
          <dt>Día con más calorías</dt>
          <dd>{highestDay === null ? 'Sin ejercicios todavía.' : `${dayLabels[highestDay.day]} (${highestDay.calories.toLocaleString('es', { maximumFractionDigits: 2 })} cal)`}</dd>
        </dl>
        <p>El promedio cuenta solo días con ejercicios. En caso de empate, se muestra el primero registrado.</p>
      </section>
      <section aria-labelledby="exercise-list-heading">
        <h2 id="exercise-list-heading">{routine.name}</h2>
        <ExerciseList contributions={summary.contributions} />
      </section>
    </>
  )
}
