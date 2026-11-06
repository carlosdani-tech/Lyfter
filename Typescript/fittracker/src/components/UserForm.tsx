import { useState, type ChangeEvent, type FormEvent, type JSX } from 'react'
import type { ExperienceLevel, UserProfile } from '../types/fitness'

interface UserFormProps {
  onSave: (details: Omit<UserProfile, 'routine'>) => void
}
interface FormErrors {
  name?: string
  age?: string
}

export default function UserForm({ onSave }: UserFormProps): JSX.Element {
  const [name, setName] = useState<string>('')
  // Keep a string while editing so the numeric input can be empty.
  const [age, setAge] = useState<string>('')
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner')
  const [errors, setErrors] = useState<FormErrors>({})
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
    if (value === 'beginner' || value === 'intermediate' || value === 'advanced') {
      setExperienceLevel(value)
      setSaved(false)
    }
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    const numericAge = Number(age)
    if (name.trim().length === 0) {
      nextErrors.name = 'Escribe un nombre que no contenga solo espacios.'
    }
    if (age.trim() === '' || !Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) {
      nextErrors.age = 'Escribe una edad entera entre 1 y 120 años.'
    }
    setErrors(nextErrors)
    setSaved(false)
    if (nextErrors.name || nextErrors.age) return
    onSave({ name: name.trim(), age: numericAge, experienceLevel })
    setSaved(true)
  }

  return (
    <section aria-labelledby="form-heading">
      <h2 id="form-heading">Datos del usuario</h2>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="name">Nombre</label>
        <input id="name" name="name" autoComplete="name" value={name} onChange={handleNameChange}
          required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />
        {errors.name && <p id="name-error" role="alert">{errors.name}</p>}
        <label htmlFor="age">Edad</label>
        <input id="age" name="age" type="number" min="1" max="120" step="1" value={age}
          onChange={handleAgeChange} required aria-invalid={Boolean(errors.age)}
          aria-describedby={errors.age ? 'age-error' : undefined} />
        {errors.age && <p id="age-error" role="alert">{errors.age}</p>}
        <label htmlFor="experience">Nivel de experiencia</label>
        <select id="experience" name="experienceLevel" value={experienceLevel} onChange={handleExperienceChange}>
          <option value="beginner">Principiante</option>
          <option value="intermediate">Intermedio</option>
          <option value="advanced">Avanzado</option>
        </select>
        <button type="submit">Guardar perfil</button>
        {saved && <p role="status">Perfil guardado.</p>}
      </form>
    </section>
  )
}

