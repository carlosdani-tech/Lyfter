export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];

export const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayOfWeek = typeof DAYS_OF_WEEK[number];

export function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return EXPERIENCE_LEVELS.some((level: ExperienceLevel): boolean => level === value);
}

export type CaloriesPerMinute = number;

export interface Exercise {
  id: string;
  name: string;
  durationMinutes: number;
  caloriesPerMinute: CaloriesPerMinute;
  distanceKm?: number;
}

export interface RoutineEntry {
  day: DayOfWeek;
  exercise: Exercise;
}

export interface WeeklyRoutine {
  name: string;
  entries: RoutineEntry[];
}

export interface UserProfile {
  name: string;
  age: number;
  experienceLevel: ExperienceLevel;
  routine: WeeklyRoutine;
}
