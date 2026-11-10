import type { DayOfWeek, Exercise, RoutineEntry, WeeklyRoutine } from "../types/fitness";

export interface DayCalorieSummary {
  day: DayOfWeek;
  calories: number;
}

export interface ExerciseCalorieContribution {
  entry: RoutineEntry;
  calories: number;
  percentage: number;
}

export interface ComparativeSummary {
  longestExercise: Exercise | null;
  highestCalorieExercise: Exercise | null;
  highestCalorieContribution: ExerciseCalorieContribution | null;
  contributions: ExerciseCalorieContribution[];
}

// Domain values and finite routine totals are validated before entering React state.
export function calculateExerciseCalories(exercise: Exercise): number {
  return exercise.durationMinutes * exercise.caloriesPerMinute;
}

// An absent or invalid distance means that pace is unavailable.
export function calculatePace(exercise: Exercise): number | undefined {
  const distance: number | undefined = exercise.distanceKm;
  if (distance === undefined || !Number.isFinite(distance) || distance <= 0) {
    return undefined;
  }
  const pace: number = exercise.durationMinutes / distance;
  return Number(pace.toFixed(2));
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
    highestCalorieExercise: highestCalorieContribution?.entry.exercise ?? null,
    highestCalorieContribution,
    contributions,
  };
}
