import type { ExerciseCalorieContribution } from '../types/fitness'
import type { ExerciseListProps } from '../types/fitness'
import type { JSX } from 'react'
import { calculatePace } from '../utils/calculations'
import { formatDuration } from '../utils/formatters'
import { dayLabels } from '../constants/fitness'

export default function ExerciseList({ contributions }: ExerciseListProps): JSX.Element {
  return (
    <>
      {contributions.length === 0 ? <p>Todavía no hay ejercicios registrados.</p> : (
        <ul className="exercise-list">
          {contributions.map(({ entry, calories, percentage }: ExerciseCalorieContribution, index: number): JSX.Element => {
            const pace = entry.exercise.category === 'cardio' ? calculatePace(entry.exercise) : undefined
            return (
              <li key={`${entry.exercise.id}-${index}`}>
                <h3>{entry.exercise.name} — {dayLabels[entry.day]}</h3>
                <p>Duración: {formatDuration(entry.exercise.durationMinutes)}</p>
                <p>Calorías: {calories.toLocaleString('es', { maximumFractionDigits: 2 })} kcal</p>
                <p>Porcentaje del total: {percentage.toFixed(2)} %</p>
                {entry.exercise.category === 'cardio' && pace !== undefined && <p>Distancia: {entry.exercise.distanceKm} km · Ritmo: {pace.toFixed(2)} min/km</p>}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
