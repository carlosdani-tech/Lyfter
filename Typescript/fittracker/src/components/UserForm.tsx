import type { UserFormProps, UserFormErrors } from '../types/fitness'
import { useState, type ChangeEvent, type FormEvent, type JSX } from 'react'
import type { ExperienceLevel, MembershipPlan } from '../types/fitness'
import { EXPERIENCE_LEVELS, MEMBERSHIP_PLANS, experienceLabels, membershipPlanLabels, isExperienceLevel, isMembershipPlan } from '../constants/fitness'

export default function UserForm({ onSave }: UserFormProps): JSX.Element {
  const [name, setName] = useState<string>('')
  // Keep a string while editing so the numeric input can be empty.
  const [age, setAge] = useState<string>('')
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner')
  const [membershipPlan, setMembershipPlan] = useState<MembershipPlan | ''>('')
  const [membershipStartDate, setMembershipStartDate] = useState<string>('')
  const [isActive, setIsActive] = useState<boolean>(true)
  const [errors, setErrors] = useState<UserFormErrors>({})
  const [saved, setSaved] = useState<boolean>(false)

  function handleNameChange(event: ChangeEvent<HTMLInputElement>): void {
    setName(event.currentTarget.value)
    setSaved(false)
  }
  function handleAgeChange(event: ChangeEvent<HTMLInputElement>): void {
    setAge(event.currentTarget.value)
    setSaved(false)
  }
  function handleExperienceChange(event: ChangeEvent<HTMLSelectElement>): void {
    const value = event.currentTarget.value
    if (isExperienceLevel(value)) {
      setExperienceLevel(value)
      setSaved(false)
    }
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const nextErrors: UserFormErrors = {}
    const numericAge = Number(age)
    if (name.trim().length === 0) {
      nextErrors.name = 'Escribe un nombre que no contenga solo espacios.'
    }
    if (age.trim() === '' || !Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) {
      nextErrors.age = 'Escribe una edad entera entre 1 y 120 años.'
    }
    if (membershipPlan === '') nextErrors.membershipPlan = 'Selecciona un plan de membresía.'
    const year = Number(membershipStartDate.slice(0, 4))
    const month = Number(membershipStartDate.slice(5, 7))
    const day = Number(membershipStartDate.slice(8, 10))
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
    const daysInMonth = month === 2 ? (leapYear ? 29 : 28) : ([4, 6, 9, 11].includes(month) ? 30 : 31)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(membershipStartDate) || year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth) {
      nextErrors.membershipStartDate = 'Introduce una fecha válida (AAAA-MM-DD).'
    }
    setErrors(nextErrors)
    setSaved(false)
    if (Object.keys(nextErrors).length > 0 || membershipPlan === '') return
    onSave({ name: name.trim(), age: numericAge, experienceLevel, membershipPlan, membershipStartDate, isActive })
    setSaved(true)
  }

  return (
    <section aria-labelledby="form-heading">
      <h2 id="form-heading">Datos del usuario</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="name">Nombre</label>
          <input id="name" name="name" autoComplete="name" value={name} onChange={handleNameChange}
            required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />
          {errors.name && <p id="name-error" role="alert">{errors.name}</p>}
        </div>
        <div className="form-field">
          <label htmlFor="age">Edad</label>
          <input id="age" name="age" type="number" min="1" max="120" step="1" value={age}
            onChange={handleAgeChange} required aria-invalid={Boolean(errors.age)}
            aria-describedby={errors.age ? 'age-error' : undefined} />
          {errors.age && <p id="age-error" role="alert">{errors.age}</p>}
        </div>
        <div className="form-field">
          <label htmlFor="experience">Nivel de experiencia</label>
          <select id="experience" name="experienceLevel" value={experienceLevel} onChange={handleExperienceChange}>
            {EXPERIENCE_LEVELS.map((level: ExperienceLevel): JSX.Element => (
              <option key={level} value={level}>{experienceLabels[level]}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="membership-plan">Plan de membresía</label>
          <select id="membership-plan" value={membershipPlan} required aria-invalid={Boolean(errors.membershipPlan)}
            aria-describedby={errors.membershipPlan ? 'membership-plan-error' : undefined} onChange={(event: ChangeEvent<HTMLSelectElement>): void => {
            const value = event.currentTarget.value
            if (value === '' || isMembershipPlan(value)) setMembershipPlan(value)
            setSaved(false)
          }}><option value="">Selecciona un plan</option>
            {MEMBERSHIP_PLANS.map((plan: MembershipPlan): JSX.Element => <option key={plan} value={plan}>{membershipPlanLabels[plan]}</option>)}
          </select>
          {errors.membershipPlan && <p id="membership-plan-error" role="alert">{errors.membershipPlan}</p>}
        </div>
        <div className="form-field">
          <label htmlFor="membership-date">Fecha de inicio</label>
          <input id="membership-date" type="date" min="0001-01-01" max="9999-12-31" required value={membershipStartDate} onChange={(event: ChangeEvent<HTMLInputElement>): void => {
            setMembershipStartDate(event.currentTarget.value)
            setSaved(false)
          }} aria-invalid={Boolean(errors.membershipStartDate)} aria-describedby={errors.membershipStartDate ? 'membership-date-error' : undefined} />
          {errors.membershipStartDate && <p id="membership-date-error" role="alert">{errors.membershipStartDate}</p>}
        </div>
        <div className="form-checkbox">
          <input id="membership-active" type="checkbox" checked={isActive} onChange={(event: ChangeEvent<HTMLInputElement>): void => {
            setIsActive(event.currentTarget.checked)
            setSaved(false)
          }} />
          <label htmlFor="membership-active">Membresía activa</label>
        </div>
        <button type="submit">Guardar perfil</button>
        {saved && <p role="status">Perfil guardado.</p>}
      </form>
    </section>
  )
}

