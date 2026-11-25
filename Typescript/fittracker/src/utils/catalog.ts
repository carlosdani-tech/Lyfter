import type { CatalogGroup, Exercise, ExerciseCategory, RoutineEntry } from '../types/fitness'
import { calculateExerciseCalories, calculatePace } from './calculations'
import { EXERCISE_CATEGORIES } from '../constants/fitness'

export function describeExercise(exercise: Exercise): string {
  const calories = calculateExerciseCalories(exercise).toLocaleString('es', { maximumFractionDigits: 2 })
  const common = `${exercise.name}, ${exercise.durationMinutes} min`
  switch (exercise.category) {
    case 'cardio': {
      const pace = calculatePace(exercise)
      return `${common} | ${exercise.distanceKm} km | Ritmo: ${pace === undefined ? 'No disponible' : `${pace.toFixed(2)} min/km`} | Zona ${exercise.heartRateZone} | ${calories} kcal`
    }
    case 'strength': return `${common} | ${exercise.sets} series × ${exercise.repetitionsPerSet} reps | ${exercise.weightKg} kg | ${calories} kcal`
    case 'flexibility': return `${common} | ${exercise.poseCount} poses | ${calories} kcal`
    default: {
      const unreachable: never = exercise
      return unreachable
    }
  }
}

export function summarizeCatalog(entries: readonly RoutineEntry[]): CatalogGroup[] {
  const groups: CatalogGroup[] = EXERCISE_CATEGORIES.map((category: ExerciseCategory): CatalogGroup => ({
    category, exercises: [], count: 0, minutes: 0, calories: 0,
  }))
  for (const { exercise } of entries) {
    const group = groups.find((candidate: CatalogGroup): boolean => candidate.category === exercise.category)
    if (group !== undefined) {
      group.exercises.push(exercise)
      group.count += 1
      group.minutes += exercise.durationMinutes
      group.calories += calculateExerciseCalories(exercise)
    }
  }
  return groups
}

export function countCatalogExercises(groups: readonly CatalogGroup[]): number {
  return groups.reduce((total: number, group: CatalogGroup): number => total + group.count, 0)
}
