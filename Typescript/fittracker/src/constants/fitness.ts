export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export const EXERCISE_CATEGORIES = ['cardio', 'strength', 'flexibility'] as const
export const MEMBERSHIP_PLANS = ['basic', 'premium'] as const
export const HEART_RATE_ZONES = [1, 2, 3, 4, 5] as const

export const experienceLabels: Record<typeof EXPERIENCE_LEVELS[number], string> = {
  beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado',
}

export const dayLabels: Record<typeof DAYS_OF_WEEK[number], string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves',
  friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
}

export const categoryLabels: Record<typeof EXERCISE_CATEGORIES[number], string> = {
  cardio: 'Cardio', strength: 'Fuerza', flexibility: 'Flexibilidad',
}

export const membershipPlanLabels: Record<typeof MEMBERSHIP_PLANS[number], string> = {
  basic: 'Básico', premium: 'Premium',
}

export function isExperienceLevel(value: unknown): value is typeof EXPERIENCE_LEVELS[number] {
  return EXPERIENCE_LEVELS.some((level: typeof EXPERIENCE_LEVELS[number]): boolean => level === value)
}

export function isMembershipPlan(value: unknown): value is typeof MEMBERSHIP_PLANS[number] {
  return MEMBERSHIP_PLANS.some((plan: typeof MEMBERSHIP_PLANS[number]): boolean => plan === value)
}
