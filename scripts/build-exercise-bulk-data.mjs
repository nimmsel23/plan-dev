#!/usr/bin/env node
/* eslint-env node */
// Bulk-JS aus unreviewed_wger.yml + vendor/free-exercise-db (kein unreviewed_yuhonas.yml).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import { KB_DIR } from './lib/kb-dir.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const EXERCISES_DIR = join(KB_DIR, 'exercises')
const YUHONAS_JSON = join(KB_DIR, 'vendor/free-exercise-db/dist/exercises.json')
const OUT_FILE = join(REPO_ROOT, 'src/lib/db/firestore/exerciseBulkData.generated.js')

function loadYaml(path) {
  return yaml.load(readFileSync(path, 'utf-8'))
}

function normalizeBulkExercise(exercise) {
  const tags = Array.isArray(exercise?.tags) ? exercise.tags : []
  const nextTags = tags.filter((tag) => tag !== 'unreviewed')
  if (!nextTags.includes('bulk_import')) nextTags.push('bulk_import')
  return {
    ...exercise,
    tags: nextTags,
    review_state:
      exercise?.review_state?.status === 'draft'
        ? { ...exercise.review_state, status: 'imported' }
        : exercise?.review_state,
  }
}

function fromYuhonasRaw(item) {
  const id = item?.id
  const name = item?.name
  if (!id || !name) return null
  return {
    exercise_id: `yuhonas_${String(id).toLowerCase().replace(/ /g, '_')}`,
    display_name: name,
    english: name,
    category: item.category || 'other',
    primary_muscles: item.primaryMuscles || [],
    secondary_muscles: item.secondaryMuscles || [],
    equipment: item.equipment ? [item.equipment] : [],
    coaching_notes: item.instructions || [],
    original_description: item.instructions || [],
    instructions: item.instructions || [],
    images: item.images || [],
    tags: ['bulk_import', 'yuhonas'],
    yuhonas_id: id,
  }
}

const exercises = []

const wgerPath = join(EXERCISES_DIR, 'unreviewed_wger.yml')
if (existsSync(wgerPath)) {
  for (const ex of loadYaml(wgerPath)?.exercises || []) {
    if (!ex || (!ex.exercise_id && !ex.id)) continue
    exercises.push(normalizeBulkExercise(ex))
  }
}

if (!existsSync(YUHONAS_JSON)) {
  throw new Error(`Yuhonas vendor JSON fehlt: ${YUHONAS_JSON}`)
}
for (const item of JSON.parse(readFileSync(YUHONAS_JSON, 'utf-8'))) {
  const ex = fromYuhonasRaw(item)
  if (ex) exercises.push(normalizeBulkExercise(ex))
}

const banner = `// AUTO-GENERATED — nicht manuell editieren.
// Quellen: unreviewed_wger.yml + vendor/free-exercise-db/dist/exercises.json
`

writeFileSync(
  OUT_FILE,
  `${banner}
export const EXERCISE_BULK_DATA = ${JSON.stringify(exercises, null, 2)};

export default EXERCISE_BULK_DATA;
`,
)
console.log(`exerciseBulkData.generated.js geschrieben: ${exercises.length} Bulk-Übungen.`)
