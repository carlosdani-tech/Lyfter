export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface Exercise {
  id: string;
  name: string;
  durationMinutes: number;
  caloriesPerMinute: number;
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
