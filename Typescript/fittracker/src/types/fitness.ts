import type { EXPERIENCE_LEVELS, DAYS_OF_WEEK, EXERCISE_CATEGORIES, MEMBERSHIP_PLANS, HEART_RATE_ZONES } from '../constants/fitness';

export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];

export type DayOfWeek = typeof DAYS_OF_WEEK[number];

export type CaloriesPerMinute = number;

export type ExerciseId = string;
export type UserId = string;
export type RoutineId = string;

export interface ExerciseBase {
  id: ExerciseId;
  name: string;
  durationMinutes: number;
  caloriesPerMinute: CaloriesPerMinute;
}

export interface StrengthExercise extends ExerciseBase {
  category: "strength";
  sets: number;
  repetitionsPerSet: number;
  weightKg: number;
}

export interface FlexibilityExercise extends ExerciseBase {
  category: "flexibility";
  poseCount: number;
}

export type HeartRateZone = typeof HEART_RATE_ZONES[number];
export type ExerciseCategory = typeof EXERCISE_CATEGORIES[number];
export interface CardioExercise extends ExerciseBase {
  category: 'cardio';
  distanceKm: number;
  heartRateZone: HeartRateZone;
}
export type Exercise = CardioExercise | StrengthExercise | FlexibilityExercise;
export type MembershipPlan = typeof MEMBERSHIP_PLANS[number];
export interface MembershipInfo {
  membershipPlan: MembershipPlan;
  membershipStartDate: string;
  isActive: boolean;
}

export interface RoutineEntry {
  day: DayOfWeek;
  exercise: Exercise;
}

export interface WeeklyRoutine {
  id: RoutineId;
  name: string;
  entries: RoutineEntry[];
}

export interface PersonalInfo {
  id: UserId;
  name: string;
  age: number;
  experienceLevel: ExperienceLevel;
}
export type UserProfile = PersonalInfo & MembershipInfo & { routine: WeeklyRoutine };

export interface ExerciseFormProps {
  onAdd: (entry: RoutineEntry) => void
}

export interface ExerciseDraftBase {
  name: string;
  durationMinutes: string;
  caloriesPerMinute: string;
}
export type ExerciseDraft = ExerciseDraftBase & (
  { category: ''; } |
  { category: 'cardio'; distanceKm: string; heartRateZone: HeartRateZone | '' } |
  { category: 'strength'; sets: string; repetitionsPerSet: string; weightKg: string } |
  { category: 'flexibility'; poseCount: string }
);
export type ExerciseField = 'name' | 'durationMinutes' | 'caloriesPerMinute' | 'distanceKm' | 'sets' | 'repetitionsPerSet' | 'weightKg' | 'poseCount';
export type ExerciseFormErrors = Partial<Record<ExerciseField | 'category' | 'heartRateZone', string>>;
export interface CatalogGroup {
  category: ExerciseCategory;
  exercises: Exercise[];
  count: number;
  minutes: number;
  calories: number;
}
export interface CatalogProps { entries: readonly RoutineEntry[] }

export interface ExerciseListProps {
  contributions: ExerciseCalorieContribution[]
}

export interface UserFormProps {
  onSave: (details: Omit<UserProfile, 'routine' | 'id'>) => void
}

export interface UserFormErrors {
  name?: string
  age?: string
  membershipPlan?: string
  membershipStartDate?: string
}

export interface UserProfileProps {
  profile: UserProfile | null
}

export interface WorkoutSummaryProps {
  routine: WeeklyRoutine
}

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
  highestCalorieContribution: ExerciseCalorieContribution | null;
  contributions: ExerciseCalorieContribution[];
}
