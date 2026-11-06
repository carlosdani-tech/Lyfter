import type { Exercise, RoutineEntry, WeeklyRoutine } from "../types/fitness";

export interface ExerciseCalorieContribution {
  entry: RoutineEntry;
  calories: number;
  percentage: number;
}

export interface ComparativeSummary {
  longestExercise: Exercise | null;
  highestCalorieExercise: Exercise | null;
  contributions: ExerciseCalorieContribution[];
}

function validateDuration(durationMinutes: number): void {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new RangeError("Exercise duration must be finite and greater than zero.");
  }
}

export function calculateExerciseCalories(exercise: Exercise): number {
  validateDuration(exercise.durationMinutes);
  if (!Number.isFinite(exercise.caloriesPerMinute) || exercise.caloriesPerMinute < 0) {
    throw new RangeError("Calories per minute must be finite and non-negative.");
  }
  const calories: number = exercise.durationMinutes * exercise.caloriesPerMinute;
  if (!Number.isFinite(calories)) {
    throw new RangeError("Exercise calories exceed the supported numeric range.");
  }
  return calories;
}

// An absent or invalid distance means that pace is unavailable.
export function calculatePace(exercise: Exercise): number | undefined {
  validateDuration(exercise.durationMinutes);
  const distance: number | undefined = exercise.distanceKm;
  if (distance === undefined || !Number.isFinite(distance) || distance <= 0) {
    return undefined;
  }
  const pace: number = exercise.durationMinutes / distance;
  const roundedPace: number = Number(pace.toFixed(2));
  if (!Number.isFinite(roundedPace)) {
    throw new RangeError("Pace exceeds the supported numeric range.");
  }
  return roundedPace;
}

export function calculateRoutineCalories(routine: WeeklyRoutine): number {
  let total: number = 0;
  for (const entry of routine.entries) {
    total += calculateExerciseCalories(entry.exercise);
    if (!Number.isFinite(total)) {
      throw new RangeError("Routine calories exceed the supported numeric range.");
    }
  }
  return total;
}

export function calculateAverageCaloriesPerTrainedDay(routine: WeeklyRoutine): number {
  const total: number = calculateRoutineCalories(routine);
  const trainedDays: Set<RoutineEntry["day"]> = new Set(
    routine.entries.map((entry: RoutineEntry): RoutineEntry["day"] => entry.day),
  );
  return trainedDays.size === 0 ? 0 : total / trainedDays.size;
}

// Ties retain the first entry. Repeated exercises contribute once per entry.
export function calculateComparativeSummary(routine: WeeklyRoutine): ComparativeSummary {
  const total: number = calculateRoutineCalories(routine);
  let longestExercise: Exercise | null = null;
  let highestCalorieExercise: Exercise | null = null;
  let highestCalories: number = -1;
  const contributions: ExerciseCalorieContribution[] = [];

  for (const entry of routine.entries) {
    const exercise: Exercise = entry.exercise;
    const calories: number = calculateExerciseCalories(exercise);
    if (longestExercise === null || exercise.durationMinutes > longestExercise.durationMinutes) {
      longestExercise = exercise;
    }
    if (calories > highestCalories) {
      highestCalorieExercise = exercise;
      highestCalories = calories;
    }
    contributions.push({
      entry,
      calories,
      percentage: total === 0 ? 0 : (calories / total) * 100,
    });
  }
  return { longestExercise, highestCalorieExercise, contributions };
}
