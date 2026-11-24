import type { JSX } from 'react'
import type { CatalogGroup, CatalogProps, Exercise } from '../types/fitness'
import { countCatalogExercises, describeExercise, summarizeCatalog } from '../utils/catalog'
import { categoryLabels } from '../constants/fitness'

export default function ExerciseCatalog({ entries }: CatalogProps): JSX.Element {
  const groups = summarizeCatalog(entries)
  const count = countCatalogExercises(groups)
  return <section aria-labelledby="catalog-heading">
    <h2 id="catalog-heading">Catálogo de ejercicios</h2>
    <ul className="catalog-counters" aria-label="Contadores por categoría">
      {groups.map((group: CatalogGroup): JSX.Element => <li key={group.category}>{categoryLabels[group.category]}: <strong>{group.count}</strong></li>)}
    </ul>
    {count === 0 && <p>Todavía no hay ejercicios en el catálogo.</p>}
    {groups.map((group: CatalogGroup): JSX.Element => <div className="catalog-group" key={group.category}>
      <h3>{categoryLabels[group.category]} ({group.count} ejercicios, {group.minutes} min, {group.calories.toLocaleString('es', { maximumFractionDigits: 2 })} kcal)</h3>
      {group.count === 0 ? <p>Sin ejercicios en esta categoría.</p> : <ul className="exercise-list">{group.exercises.map((exercise: Exercise): JSX.Element => <li key={exercise.id}>{describeExercise(exercise)}</li>)}</ul>}
    </div>)}
    <p>Total: {count} ejercicios</p>
  </section>
}
