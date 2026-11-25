import { useState, type JSX } from 'react'
import UserForm from './components/UserForm'
import UserProfile from './components/UserProfile'
import ExerciseForm from './components/ExerciseForm'
import WorkoutSummary from './components/WorkoutSummary'
import ExerciseCatalog from './components/ExerciseCatalog'
import type { RoutineEntry, UserProfile as Profile } from './types/fitness'

export default function App(): JSX.Element {
  const [profile, setProfile] = useState<Profile | null>(null)
  function saveProfile(details: Omit<Profile, 'routine' | 'id'>): void {
    if (profile === null) {
      setProfile({
        ...details,
        id: crypto.randomUUID(),
        routine: { id: crypto.randomUUID(), name: 'Rutina semanal', entries: [] },
      })
      return
    }
    setProfile((previous: Profile | null): Profile | null =>
      previous === null ? previous : { ...previous, ...details },
    )
  }
  function addExercise(entry: RoutineEntry): void {
    setProfile((previous: Profile | null): Profile | null => {
      if (previous === null) return previous
      return {
        ...previous,
        routine: { ...previous.routine, entries: [...previous.routine.entries, entry] },
      }
    })
  }
  return (
    <main>
      <h1>FitTracker</h1>
      <UserForm onSave={saveProfile} />
      <UserProfile profile={profile} />
      {profile === null ? <p>Guarda tu perfil para registrar ejercicios.</p> : (
        <>
          <ExerciseForm onAdd={addExercise} />
          <ExerciseCatalog entries={profile.routine.entries} />
          <WorkoutSummary routine={profile.routine} />
        </>
      )}
    </main>
  )
}

