import { useState, type ChangeEvent, type FormEvent, type JSX } from 'react'
import type { DayOfWeek, Exercise, ExerciseCategory, ExerciseDraft, ExerciseField, ExerciseFormErrors, ExerciseFormProps, HeartRateZone, RoutineEntry } from '../types/fitness'
import { EXERCISE_CATEGORIES, categoryLabels, HEART_RATE_ZONES, DAYS_OF_WEEK, dayLabels } from '../constants/fitness'
import { calculateRoutineCalories } from '../utils/calculations'

const emptyDraft: ExerciseDraft = { category: '', name: '', durationMinutes: '', caloriesPerMinute: '' }

export default function ExerciseForm({ routine, onAdd }: ExerciseFormProps): JSX.Element {
  const [draft, setDraft] = useState<ExerciseDraft>(emptyDraft)
  const [day, setDay] = useState<DayOfWeek>('monday')
  const [errors, setErrors] = useState<ExerciseFormErrors>({})
  const [saved, setSaved] = useState<boolean>(false)

  function changeCategory(event: ChangeEvent<HTMLSelectElement>): void {
    const category = event.currentTarget.value
    const common = { name: draft.name, durationMinutes: draft.durationMinutes, caloriesPerMinute: draft.caloriesPerMinute }
    switch (category) {
      case 'cardio': setDraft({ ...common, category, distanceKm: '', heartRateZone: '' }); break
      case 'strength': setDraft({ ...common, category, sets: '', repetitionsPerSet: '', weightKg: '' }); break
      case 'flexibility': setDraft({ ...common, category, poseCount: '' }); break
      case '': setDraft({ ...common, category }); break
      default: return
    }
    setErrors({})
    setSaved(false)
  }
  function changeField(field: ExerciseField, value: string): void {
    setDraft((previous: ExerciseDraft): ExerciseDraft => {
      switch (field) {
        case 'name': case 'durationMinutes': case 'caloriesPerMinute': return { ...previous, [field]: value }
        case 'distanceKm': return previous.category === 'cardio' ? { ...previous, distanceKm: value } : previous
        case 'sets': case 'repetitionsPerSet': case 'weightKg': return previous.category === 'strength' ? { ...previous, [field]: value } : previous
        case 'poseCount': return previous.category === 'flexibility' ? { ...previous, poseCount: value } : previous
      }
    })
    setSaved(false)
  }
  function input(field: ExerciseField, label: string, value: string, integer: boolean = false): JSX.Element {
    const id = `exercise-${field}`
    return <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} type={field === 'name' ? 'text' : 'number'} min={field === 'name' ? undefined : 0}
        step={integer ? '1' : 'any'} required onChange={(event: ChangeEvent<HTMLInputElement>): void => changeField(field, event.currentTarget.value)}
        aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${id}-error` : undefined} />
      {errors[field] && <p id={`${id}-error`} role="alert">{errors[field]}</p>}
    </div>
  }
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const next: ExerciseFormErrors = {}
    function numeric(field: ExerciseField, text: string, positive: boolean, integer: boolean = false): number {
      const value = Number(text)
      if (text.trim() === '' || !Number.isFinite(value) || (positive ? value <= 0 : value < 0) || (integer && !Number.isSafeInteger(value))) {
        next[field] = `Introduce un número ${integer ? 'entero seguro ' : 'finito '}${positive ? 'mayor que cero' : 'mayor o igual a cero'}.`
      }
      return value
    }
    if (!draft.name.trim()) next.name = 'Escribe el nombre del ejercicio.'
    const durationMinutes = numeric('durationMinutes', draft.durationMinutes, true)
    const caloriesPerMinute = numeric('caloriesPerMinute', draft.caloriesPerMinute, false)
    if (!Number.isFinite(calculateRoutineCalories(routine) + durationMinutes * caloriesPerMinute)) next.caloriesPerMinute = 'El total de calorías es demasiado grande.'
    if (!Number.isFinite(routine.entries.reduce((total: number, entry: RoutineEntry): number => total + entry.exercise.durationMinutes, 0) + durationMinutes)) next.durationMinutes = 'El total de minutos es demasiado grande.'
    const common = { id: crypto.randomUUID(), name: draft.name.trim(), durationMinutes, caloriesPerMinute }
    let exercise: Exercise | undefined
    switch (draft.category) {
      case '': next.category = 'Selecciona una categoría.'; break
      case 'cardio': {
        const distanceKm = numeric('distanceKm', draft.distanceKm, true)
        if (!Number.isFinite(durationMinutes / distanceKm)) next.distanceKm = 'La distancia no permite calcular un ritmo finito.'
        if (draft.heartRateZone === '') next.heartRateZone = 'Selecciona una zona de frecuencia cardíaca.'
        else exercise = { ...common, category: 'cardio', distanceKm, heartRateZone: draft.heartRateZone }
        break
      }
      case 'strength': exercise = { ...common, category: 'strength', sets: numeric('sets', draft.sets, true, true), repetitionsPerSet: numeric('repetitionsPerSet', draft.repetitionsPerSet, true, true), weightKg: numeric('weightKg', draft.weightKg, false) }; break
      case 'flexibility': exercise = { ...common, category: 'flexibility', poseCount: numeric('poseCount', draft.poseCount, true, true) }; break
    }
    setErrors(next)
    setSaved(false)
    if (Object.keys(next).length || exercise === undefined) return
    onAdd({ day, exercise })
    setDraft(emptyDraft)
    setDay('monday')
    setSaved(true)
  }
  return <section aria-labelledby="exercise-form-heading">
    <h2 id="exercise-form-heading">Registrar ejercicio</h2>
    <form onSubmit={submit} noValidate>
      <div className="form-field">
        <label htmlFor="exercise-category">Categoría</label>
        <select id="exercise-category" value={draft.category} onChange={changeCategory} required aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'category-error' : undefined}>
          <option value="">Selecciona una categoría</option>
          {EXERCISE_CATEGORIES.map((category: ExerciseCategory): JSX.Element => <option key={category} value={category}>{categoryLabels[category]}</option>)}
        </select>
        {errors.category && <p id="category-error" role="alert">{errors.category}</p>}
      </div>
      {draft.category !== '' && <>
        {input('name', 'Nombre', draft.name)}
        <div className="form-field">
          <label htmlFor="exercise-day">Día</label>
          <select id="exercise-day" value={day} onChange={(event: ChangeEvent<HTMLSelectElement>): void => {
            const selected = DAYS_OF_WEEK.find((value: DayOfWeek): boolean => value === event.currentTarget.value)
            if (selected !== undefined) setDay(selected)
            setSaved(false)
          }}>{DAYS_OF_WEEK.map((value: DayOfWeek): JSX.Element => <option key={value} value={value}>{dayLabels[value]}</option>)}</select>
        </div>
        {input('durationMinutes', 'Duración (minutos)', draft.durationMinutes)}
        {input('caloriesPerMinute', 'Calorías por minuto', draft.caloriesPerMinute)}
        {draft.category === 'cardio' && <>
          {input('distanceKm', 'Distancia (km)', draft.distanceKm)}
          <div className="form-field">
            <label htmlFor="heart-rate-zone">Zona de frecuencia cardíaca</label>
            <select id="heart-rate-zone" value={draft.heartRateZone} required aria-invalid={Boolean(errors.heartRateZone)}
              aria-describedby={errors.heartRateZone ? 'heart-rate-zone-error' : undefined} onChange={(event: ChangeEvent<HTMLSelectElement>): void => {
              const value = event.currentTarget.value
              const zone = HEART_RATE_ZONES.find((candidate: HeartRateZone): boolean => String(candidate) === value)
              if (value === '') setDraft({ ...draft, heartRateZone: '' })
              else if (zone !== undefined) setDraft({ ...draft, heartRateZone: zone })
              setSaved(false)
            }}><option value="">Selecciona una zona</option>{HEART_RATE_ZONES.map((zone: HeartRateZone): JSX.Element => <option key={zone} value={zone}>Zona {zone}</option>)}</select>
            {errors.heartRateZone && <p id="heart-rate-zone-error" role="alert">{errors.heartRateZone}</p>}
          </div>
        </>}
        {draft.category === 'strength' && <>{input('sets', 'Series', draft.sets, true)}{input('repetitionsPerSet', 'Repeticiones por serie', draft.repetitionsPerSet, true)}{input('weightKg', 'Peso (kg)', draft.weightKg)}</>}
        {draft.category === 'flexibility' && input('poseCount', 'Número de poses', draft.poseCount, true)}
      </>}
      <button type="submit">Agregar ejercicio</button>
      {saved && <p role="status">Ejercicio registrado.</p>}
    </form>
  </section>
}
