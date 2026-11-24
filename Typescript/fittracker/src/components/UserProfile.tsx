import type { UserProfileProps } from '../types/fitness'
import type { JSX } from 'react'
import { experienceLabels, membershipPlanLabels } from '../constants/fitness'

export default function UserProfile({ profile }: UserProfileProps): JSX.Element {
  return (
    <section aria-labelledby="profile-heading">
      <h2 id="profile-heading">Perfil actual</h2>
      {profile === null ? <p>Todavía no has guardado un perfil.</p> : (
        <dl>
          <dt>Nombre</dt><dd>{profile.name}</dd>
          <dt>Edad</dt><dd>{profile.age} años</dd>
          <dt>Nivel de experiencia</dt><dd>{experienceLabels[profile.experienceLevel]}</dd>
          <dt>Membresía</dt><dd>{membershipPlanLabels[profile.membershipPlan]}</dd>
          <dt>Fecha de inicio</dt><dd>{profile.membershipStartDate}</dd>
          <dt>Estado</dt><dd>{profile.isActive ? 'Activa' : 'Inactiva'}</dd>
        </dl>
      )}
    </section>
  )
}

