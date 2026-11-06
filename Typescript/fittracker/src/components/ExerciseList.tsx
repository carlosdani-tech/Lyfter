import type { JSX } from 'react'
import type { WeeklyRoutine } from '../types/fitness'
import { calculatePace, type ExerciseCalorieContribution } from '../utils/calculations'
import { formatDuration } from '../utils/formatters'
import { dayLabels } from './weekdays'

interface ExerciseListProps {
  routine: WeeklyRoutine
  contributions: ExerciseCalorieContribution[]
}

export default function ExerciseList({ routine, contributions }: ExerciseListProps): JSX.Element {
  return (
    <section aria-labelledby="exercise-list-heading">
      <h2 id="exercise-list-heading">{routine.name}</h2>
      {routine.entries.length === 0 ? <p>Todavía no hay ejercicios registrados.</p> : (
        <ul>
          {contributions.map(({ entry, calories, percentage }: ExerciseCalorieContribution): JSX.Element => {
            const pace = calculatePace(entry.exercise)
            return (
              <li key={entry.exercise.id}>
                <h3>{entry.exercise.name} — {dayLabels[entry.day]}</h3>
                <p>Duración: {formatDuration(entry.exercise.durationMinutes)}</p>
                <p>Calorías: {calories.toLocaleString('es', { maximumFractionDigits: 2 })} kcal</p>
                <p>Porcentaje del total: {percentage.toFixed(2)} %</p>
                {pace !== undefined && <p>Distancia: {entry.exercise.distanceKm} km · Ritmo: {pace.toFixed(2)} min/km</p>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
