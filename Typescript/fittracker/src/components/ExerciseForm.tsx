import { useState, type ChangeEvent, type FormEvent, type JSX } from 'react'
import type { DayOfWeek, RoutineEntry, WeeklyRoutine } from '../types/fitness'
import { calculateRoutineCalories } from '../utils/calculations'
import { dayLabels, days } from '../constants/weekdays'

interface ExerciseFormProps {
  routine: WeeklyRoutine
  onAdd: (entry: RoutineEntry) => void
}

interface ExerciseDraft {
  name: string
  durationMinutes: string
  caloriesPerMinute: string
  distanceKm: string
}

type FormErrors = Partial<Record<keyof ExerciseDraft, string>>

const emptyDraft: ExerciseDraft = {
  name: '', durationMinutes: '', caloriesPerMinute: '', distanceKm: '',
}

export default function ExerciseForm({ routine, onAdd }: ExerciseFormProps): JSX.Element {
  const [draft, setDraft] = useState<ExerciseDraft>(emptyDraft)
  const [day, setDay] = useState<DayOfWeek>('monday')
  const [errors, setErrors] = useState<FormErrors>({})
  const [saved, setSaved] = useState<boolean>(false)

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.currentTarget
    if (name === 'name' || name === 'durationMinutes' || name === 'caloriesPerMinute' || name === 'distanceKm') {
      setDraft((previous: ExerciseDraft): ExerciseDraft => ({ ...previous, [name]: value }))
      setSaved(false)
    }
  }

  function handleDayChange(event: ChangeEvent<HTMLSelectElement>): void {
    const selected = days.find((value: DayOfWeek): boolean => value === event.currentTarget.value)
    if (selected !== undefined) setDay(selected)
    setSaved(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const duration = Number(draft.durationMinutes)
    const calories = Number(draft.caloriesPerMinute)
    const distance = draft.distanceKm.trim() === '' ? undefined : Number(draft.distanceKm)
    const nextErrors: FormErrors = {}

    if (draft.name.trim() === '') nextErrors.name = 'Escribe el nombre del ejercicio.'
    if (draft.durationMinutes.trim() === '' || !Number.isFinite(duration) || duration <= 0) {
      nextErrors.durationMinutes = 'La duración debe ser un número finito mayor que cero.'
    }
    if (draft.caloriesPerMinute.trim() === '' || !Number.isFinite(calories) || calories < 0) {
      nextErrors.caloriesPerMinute = 'Las calorías por minuto deben ser un número finito mayor o igual a cero.'
    }
    if (distance !== undefined && (!Number.isFinite(distance) || distance <= 0)) {
      nextErrors.distanceKm = 'La distancia debe ser un número finito mayor que cero, o quedar vacía.'
    }
    if (!nextErrors.durationMinutes && !nextErrors.caloriesPerMinute
      && !Number.isFinite(calculateRoutineCalories(routine) + duration * calories)) {
      nextErrors.caloriesPerMinute = 'Las calorías del ejercicio o el total de la rutina son demasiado grandes; reduce los valores.'
    }
    if (!nextErrors.durationMinutes && !nextErrors.distanceKm && distance !== undefined && !Number.isFinite(duration / distance)) {
      nextErrors.distanceKm = 'El ritmo calculado es demasiado grande; revisa la distancia y la duración.'
    }
    setErrors(nextErrors)
    setSaved(false)
    if (Object.keys(nextErrors).length > 0) return

    onAdd({
      day,
      exercise: {
        id: crypto.randomUUID(), name: draft.name.trim(),
        durationMinutes: duration, caloriesPerMinute: calories,
        ...(distance === undefined ? {} : { distanceKm: distance }),
      },
    })
    setDraft(emptyDraft)
    setDay('monday')
    setSaved(true)
  }

  return (
    <section aria-labelledby="exercise-form-heading">
      <h2 id="exercise-form-heading">Registrar ejercicio</h2>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="exercise-name">Nombre del ejercicio</label>
        <input id="exercise-name" name="name" value={draft.name} onChange={handleInputChange}
          required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'exercise-name-error' : undefined} />
        {errors.name && <p id="exercise-name-error" role="alert">{errors.name}</p>}
        <label htmlFor="exercise-day">Día de la semana</label>
        <select id="exercise-day" value={day} onChange={handleDayChange}>
          {days.map((value: DayOfWeek): JSX.Element => <option key={value} value={value}>{dayLabels[value]}</option>)}
        </select>
        <label htmlFor="exercise-duration">Duración (minutos)</label>
        <input id="exercise-duration" name="durationMinutes" type="number" min="0" step="any"
          value={draft.durationMinutes} onChange={handleInputChange} required
          aria-invalid={Boolean(errors.durationMinutes)} aria-describedby={errors.durationMinutes ? 'duration-error' : undefined} />
        {errors.durationMinutes && <p id="duration-error" role="alert">{errors.durationMinutes}</p>}
        <label htmlFor="exercise-calories">Calorías por minuto</label>
        <input id="exercise-calories" name="caloriesPerMinute" type="number" min="0" step="any"
          value={draft.caloriesPerMinute} onChange={handleInputChange} required
          aria-invalid={Boolean(errors.caloriesPerMinute)} aria-describedby={errors.caloriesPerMinute ? 'calories-error' : undefined} />
        {errors.caloriesPerMinute && <p id="calories-error" role="alert">{errors.caloriesPerMinute}</p>}
        <label htmlFor="exercise-distance">Distancia (km, opcional)</label>
        <input id="exercise-distance" name="distanceKm" type="number" min="0" step="any"
          value={draft.distanceKm} onChange={handleInputChange}
          aria-invalid={Boolean(errors.distanceKm)} aria-describedby={errors.distanceKm ? 'distance-error' : undefined} />
        {errors.distanceKm && <p id="distance-error" role="alert">{errors.distanceKm}</p>}
        <button type="submit">Agregar ejercicio</button>
        {saved && <p role="status">Ejercicio registrado.</p>}
      </form>
    </section>
  )
}
