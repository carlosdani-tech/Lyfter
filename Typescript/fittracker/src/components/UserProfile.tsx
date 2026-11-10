import type { JSX } from 'react'
import type { UserProfile as Profile } from '../types/fitness'
import { experienceLabels } from './experienceLevels'

interface UserProfileProps {
  profile: Profile | null
}
export default function UserProfile({ profile }: UserProfileProps): JSX.Element {
  return (
    <section aria-labelledby="profile-heading">
      <h2 id="profile-heading">Perfil actual</h2>
      {profile === null ? <p>Todavía no has guardado un perfil.</p> : (
        <dl>
          <dt>Nombre</dt><dd>{profile.name}</dd>
          <dt>Edad</dt><dd>{profile.age} años</dd>
          <dt>Nivel de experiencia</dt><dd>{experienceLabels[profile.experienceLevel]}</dd>
        </dl>
      )}
    </section>
  )
}

