import type { CardioExercise, DayOfWeek, Exercise, RoutineEntry, WeeklyRoutine, DayCalorieSummary, ExerciseCalorieContribution, ComparativeSummary } from "../types/fitness";

// Form fields are validated before entering React state.
export function calculateExerciseCalories(exercise: Exercise): number {
  return exercise.durationMinutes * exercise.caloriesPerMinute;
}

// An absent or invalid distance means that pace is unavailable.
export function calculatePace(exercise: CardioExercise): number | undefined {
  const distance: number = exercise.distanceKm;
  if (!Number.isFinite(distance) || distance <= 0) {
    return undefined;
  }
  const pace: number = exercise.durationMinutes / distance;
  return Number.isFinite(pace) ? Number(pace.toFixed(2)) : undefined;
}

export function calculateRoutineCalories(routine: WeeklyRoutine): number {
  let total: number = 0;
  for (const entry of routine.entries) {
    total += calculateExerciseCalories(entry.exercise);
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

// Map preserves the first appearance of each trained day, breaking ties consistently.
export function findHighestCalorieDay(routine: WeeklyRoutine): DayCalorieSummary | null {
  const dailyCalories: Map<DayOfWeek, number> = new Map();
  for (const entry of routine.entries) {
    const calories: number = (dailyCalories.get(entry.day) ?? 0)
      + calculateExerciseCalories(entry.exercise);
    dailyCalories.set(entry.day, calories);
  }

  let highestDay: DayCalorieSummary | null = null;
  for (const [day, calories] of dailyCalories) {
    if (highestDay === null || calories > highestDay.calories) {
      highestDay = { day, calories };
    }
  }
  return highestDay;
}

// Ties retain the first entry. Repeated exercises contribute once per entry.
export function calculateComparativeSummary(routine: WeeklyRoutine): ComparativeSummary {
  const total: number = calculateRoutineCalories(routine);
  let longestExercise: Exercise | null = null;
  let highestCalorieContribution: ExerciseCalorieContribution | null = null;
  const contributions: ExerciseCalorieContribution[] = [];

  for (const entry of routine.entries) {
    const exercise: Exercise = entry.exercise;
    const calories: number = calculateExerciseCalories(exercise);
    if (longestExercise === null || exercise.durationMinutes > longestExercise.durationMinutes) {
      longestExercise = exercise;
    }
    const contribution: ExerciseCalorieContribution = {
      entry,
      calories,
      percentage: total === 0 ? 0 : (calories / total) * 100,
    };
    contributions.push(contribution);
    if (highestCalorieContribution === null || calories > highestCalorieContribution.calories) {
      highestCalorieContribution = contribution;
    }
  }
  return {
    longestExercise,
    highestCalorieContribution,
    contributions,
  };
}
