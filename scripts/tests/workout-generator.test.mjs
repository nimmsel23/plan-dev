import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { load as loadYaml } from 'js-yaml'
import {
  WORKOUT_CATALOG as catalog,
  generateWorkoutPlan,
  validateWorkoutCatalog,
  workoutPlanMarkdown,
  workoutTemplateChoices,
} from '../../src/views/Plan/lib/workoutGenerator.js'
import { snapshotOf } from '../../src/views/Plan/lib/planVersions.js'
import { prescriptionGroups, repetitionLabel } from '../../src/views/Plan/lib/planDocument.js'
import { PLAN_PRESETS, planFromPreset } from '../../src/views/Plan/lib/planPresets.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const cli = (...args) =>
  spawnSync(process.execPath, [join(root, 'bin/plan-generate'), ...args], { encoding: 'utf8', cwd: tmpdir() })
const build = (options = {}, data = catalog) =>
  generateWorkoutPlan({ name: 'Daniel', level: 'advanced', ...options }, data)

test('all templates × 3 levels generate valid source-backed, independent plans', () => {
  for (const template of catalog.templates)
    for (const level of Object.keys(catalog.levels)) {
      const plan = build({ template: template.id, level })
      assert.equal(plan.routines.length, template.routines.length)
      assert(plan.description.length <= 2000, `${template.id}: description limit`)
      assert(plan.core === null || plan.core.required)
      assert.equal(plan.schedule.cycleDays, template.cycleDays)
      for (const routine of plan.routines) {
        assert.deepEqual(routine.weekdays, template.cycleDays === 7 ? [routine.cycleDay - 1] : [])
        for (const ex of routine.exercises) {
          if (ex.yuhonas_id) {
            const path = join(root, 'vendor/free-exercise-db/exercises', `${ex.yuhonas_id}.json`)
            assert(existsSync(path), ex.yuhonas_id)
            const source = JSON.parse(readFileSync(path, 'utf8'))
            assert.deepEqual(ex.primaryMuscles, source.primaryMuscles)
            assert.deepEqual(ex.secondaryMuscles, source.secondaryMuscles)
          } else {
            assert.equal(ex.source.type, 'coach-template')
            assert(ex.instructions.length >= 3)
            assert(ex.notes.includes(ex.instructions[0]))
          }
          assert(ex.templateSets.length >= 1)
          assert(ex.templateSets.every((s) => s.targetWeight === null))
          if (ex.trackingType === 'duration')
            assert(ex.templateSets.every((s) => s.targetReps === null && s.targetDuration > 0))
          else assert(ex.templateSets.every((s) => s.targetReps && s.targetDuration === null))
        }
      }
    }
  const a = build()
  a.routines[0].exercises[0].templateSets[0].targetWeight = 100
  a.routines[0].exercises[0].primaryMuscles.push('not-a-muscle')
  assert.equal(build().routines[0].exercises[0].templateSets[0].targetWeight, null)
  assert(!build().routines[0].exercises[0].primaryMuscles.includes('not-a-muscle'))
})

test('every exercise alternative replaces one slot and preserves the 5×5/isolation boundary', () => {
  for (const template of catalog.templates) {
    const original = build({ template: template.id })
    const selectors = [...new Set(template.routines.flatMap((r) => r.exercises.map((e) => e.selector).filter(Boolean)))]
    for (const key of selectors)
      for (const choice of catalog.selectors[key].choices) {
        const plan = build({ template: template.id, variants: { [key]: choice } })
        assert.equal(plan.generator.choices[key], choice)
        for (const [i, routine] of plan.routines.entries()) {
          assert.equal(routine.exercises.length, original.routines[i].exercises.length)
          for (const [j, slot] of template.routines[i].exercises.entries())
            if (slot.selector === key) {
              assert.equal(routine.exercises[j].yuhonas_id, catalog.exercises[choice].yuhonas_id)
            }
        }
      }
  }
  const plan = build({ variants: { 'chest-press': 'incline-bb', row: 'barbell-row', hinge: 'sumo' } })
  assert.deepEqual(plan.schedule.restDays, [3, 7])
  assert.equal(plan.routines[0].exercises[0].yuhonas_id, 'Barbell_Incline_Bench_Press_-_Medium_Grip')
  assert.equal(plan.routines[1].exercises[0].yuhonas_id, 'Bent_Over_Barbell_Row')
  assert.equal(plan.routines[4].exercises[0].yuhonas_id, 'Sumo_Deadlift')
  for (const r of plan.routines) {
    assert.equal(r.exercises.filter((e) => e.kind === 'compound').length, 1)
    assert.equal(r.exercises[0].templateSets.length, 5)
    assert(r.exercises.slice(1).every((e) => e.kind === 'isolation'))
    assert(!r.exercises.some((e) => /lunge|split.squat|leg.press/i.test(e.yuhonas_id)))
  }
})

test('six-unit template is an 8-day rotation, never silently a 7-day week', () => {
  const plan = build({ template: 'ppl-six' })
  assert.deepEqual(plan.schedule.trainingDays, [1, 2, 3, 5, 6, 7])
  assert.deepEqual(plan.schedule.restDays, [4, 8])
  assert(plan.routines.every((r) => !r.weekdays.length && r.targetPeriodDays === 8))
  assert.equal(plan.routines[2].restHoursAfter, 48)
  assert.equal(plan.routines[5].restHoursAfter, 48)
  assert.match(workoutPlanMarkdown(plan), /\| 8 \| Pause \|/)
})

test('JSON definitions control prescriptions and preset consumers without code changes', () => {
  const custom = structuredClone(catalog)
  custom.levels.intermediate.main.sets = 4
  assert.equal(build({ level: 'intermediate' }, custom).routines[0].exercises[0].templateSets.length, 4)
  assert.equal(PLAN_PRESETS.length, catalog.templates.length)
  for (const t of catalog.templates) assert.equal(planFromPreset(t.id).routines.length, t.routines.length)
  const first = planFromPreset('five-two-legs')
  first.routines[0].exercises.length = 0
  assert(planFromPreset('five-two-legs').routines[0].exercises.length)
  assert.equal(build({ template: 'advanced-5x5' }).generator.templateId, 'five-two-legs')
  assert.equal(build({ level: ' Beginner ' }).generator.templateId, 'full-body')
})

test('invalid inputs and malformed catalog fail instead of falling back', () => {
  for (const options of [
    { name: '' },
    { name: 'one\ntwo' },
    { name: 'x'.repeat(61) },
    { level: 'expert' },
    { level: 'constructor' },
    { template: 'unknown' },
    { weeks: 0 },
    { weeks: 1.5 },
    { weeks: 53 },
    { core: 'maybe' },
    { variants: { hinge: 'bench' } },
    { variants: { absent: 'sumo' } },
    { template: 'daniel-classic-five', variants: { 'vertical-pull': 'pullup' } },
  ])
    assert.throws(() => build(options))
  const broken = structuredClone(catalog)
  broken.templates
    .find((t) => t.id === 'five-two-legs')
    .routines[0].exercises.push({ exercise: 'incline', role: 'compound' })
  assert.throws(() => validateWorkoutCatalog(broken), /Ein-Compound-Regel/)
  const invalid = structuredClone(catalog)
  invalid.levels.beginner.main.reps = '12-8'
  assert.throws(() => validateWorkoutCatalog(invalid), /Wiederholungsbereich/)
})

test('CLI works from another directory and emits parseable JSON, YAML and Markdown', () => {
  const args = ['--name', 'Daniel', '--level', 'intermediate', '--template', 'five-two-legs']
  const json = cli(...args, '--format', 'json')
  assert.equal(json.status, 0, json.stderr)
  assert.equal(json.stderr, '')
  assert.equal(JSON.parse(json.stdout).generator.level, 'intermediate')
  const yaml = cli(...args, '--format', 'yaml')
  assert.equal(yaml.status, 0, yaml.stderr)
  assert.deepEqual(loadYaml(yaml.stdout), JSON.parse(json.stdout))
  const md = cli(...args)
  assert.equal(md.status, 0, md.stderr)
  assert.match(md.stdout, /^# Daniel/)
  assert.match(md.stdout, /Core als fester Trainingsbaustein/)
  const noCore = cli('Daniel', '--level', 'beginner', '--core', 'none', '--format', 'json')
  assert.equal(JSON.parse(noCore.stdout).core, null)
  const list = cli('--list', '--format', 'json')
  assert.equal(JSON.parse(list.stdout).templates.length, catalog.templates.length)
  assert.equal(Object.keys(JSON.parse(list.stdout).goals).length, Object.keys(catalog.goals).length)
})

test('broader intake selects goal- and equipment-appropriate templates and core modules', () => {
  const vitality = build({ name: 'Maria', level: 'beginner', goal: 'vitality' })
  assert.equal(vitality.generator.templateId, 'vital-health')
  assert.equal(vitality.core.id, 'posture')
  assert.equal(vitality.routines.length, 2)

  const homeDumbbell = build({ name: 'Thomas', level: 'intermediate', equipment: 'dumbbell' })
  assert.equal(homeDumbbell.generator.templateId, 'home-dumbbell')
  assert.equal(homeDumbbell.routines.length, 3)

  const mobility = build({ name: 'Stefan', level: 'beginner', goal: 'mobility' })
  assert.equal(mobility.generator.templateId, 'mobility-flow')
  assert.equal(mobility.core.id, 'mobility')

  const customCore = build({ level: 'advanced', core: 'posture' })
  assert.equal(customCore.core.id, 'posture')
  assert.match(customCore.core.label, /Rumpf/)

  const cliVital = cli('--name', 'Maria', '--goal', 'vitality', '--level', 'beginner', '--format', 'json')
  assert.equal(cliVital.status, 0)
  assert.equal(JSON.parse(cliVital.stdout).generator.templateId, 'vital-health')
  assert.equal(JSON.parse(cliVital.stdout).core.id, 'posture')
})

test('CLI rejects conflicting selections and protects existing output files', () => {
  for (const args of [
    ['Daniel'],
    ['Daniel', '--level', 'advanced', '--variant', 'hinge'],
    ['Daniel', '--level', 'advanced', '--variant', '__proto__=sumo'],
    ['Daniel', '--level', 'advanced', '--variant', 'hinge=sumo', '--variant', 'hinge=hinge'],
    ['Daniel', '--level', 'intermediate', '--format', 'pdf'],
    ['Daniel', 'Other', '--level', 'beginner'],
    ['Daniel', '--name', 'Other', '--level', 'beginner'],
  ]) {
    const r = cli(...args)
    assert.equal(r.status, 2)
    assert.equal(r.stdout, '')
    assert(r.stderr)
  }
  const dir = mkdtempSync(join(tmpdir(), 'plan-generator-'))
  try {
    const output = join(dir, 'plan.md')
    assert.equal(cli('Daniel', '--level', 'advanced', '--output', output).status, 0)
    const original = readFileSync(output, 'utf8')
    const repeat = cli('Daniel', '--level', 'beginner', '--output', output)
    assert.equal(repeat.status, 2)
    assert.match(repeat.stderr, /existiert bereits/)
    assert.equal(readFileSync(output, 'utf8'), original)
    const custom = structuredClone(catalog)
    custom.levels.beginner.main.sets = 1
    const config = join(dir, 'templates.json')
    writeFileSync(config, JSON.stringify(custom))
    const r = cli('Daniel', '--level', 'beginner', '--catalog', config, '--format', 'json')
    assert.equal(r.status, 0, r.stderr)
    assert.equal(JSON.parse(r.stdout).routines[0].exercises[0].templateSets.length, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('new templates keep core defaults overridable and require truthful equipment', () => {
  for (const id of ['vital-shoulder-neck', 'kettlebell-vital']) {
    assert.equal(build({ template: id }).core.id, 'posture')
    assert.equal(build({ template: id, core: 'mobility' }).core.id, 'mobility')
    assert.equal(build({ template: id, core: 'none' }).core, null)
    assert(PLAN_PRESETS.some((p) => p.id === id && p.core.id === 'posture'))
    const template = catalog.templates.find((t) => t.id === id)
    for (const routine of template.routines)
      for (const slot of routine.exercises) {
        const choices = slot.selector ? catalog.selectors[slot.selector].choices : [slot.exercise]
        for (const key of choices) {
          const ex = catalog.exercises[key]
          const source = JSON.parse(
            readFileSync(
              join(root, 'vendor/free-exercise-db/exercises', `${ex.yuhonas_id || ex.source?.related_yuhonas_id}.json`),
            ),
          )
          const equipment = !source.equipment || source.equipment === 'body only' ? 'bodyweight' : source.equipment
          if (!ex.sourceVariation) assert(template.equipment.includes(equipment), `${id}/${key}: ${equipment}`)
          assert(
            (ex.requires || []).every((item) => template.equipment.includes(item)),
            `${id}/${key}: additional equipment`,
          )
        }
      }
  }
  const broken = structuredClone(catalog)
  broken.templates[0].defaultCore = 'missing'
  assert.throws(() => validateWorkoutCatalog(broken), /Template-Core/)
})

test('requirements intersect, including explicit templates and selected exercise equipment', () => {
  const plan = build({ goal: 'home', equipment: 'dumbbell', days: 3 })
  assert.equal(plan.generator.templateId, 'home-dumbbell')
  assert(
    plan.routines
      .flatMap((r) => r.exercises)
      .every((e) => e.equipment.every((item) => ['dumbbell', 'body only'].includes(item))),
  )
  assert.equal(build({ goal: 'vitality', equipment: 'dumbbell', days: 2 }).routines.length, 2)
  assert.equal(build({ goal: 'hypertrophy', equipment: 'gym', days: 4 }).generator.templateId, 'push-pull')
  assert.equal(build({ days: 5 }).routines.length, 5)
  assert.throws(
    () => build({ goal: 'vitality', equipment: 'dumbbell', days: 3 }),
    /Keine passende Vorlage.*Nahe Alternativen/,
  )
  assert.throws(() => build({ template: 'ppl-six', days: 6 }), /widerspricht.*6 Einheiten \/ 8 Tage/)
  assert.throws(() => build({ template: 'home-dumbbell', goal: 'hypertrophy' }), /widerspricht/)
  assert.throws(() => build({ template: 'kettlebell-vital', equipment: 'dumbbell' }), /Equipment unpassend/)
  assert.throws(
    () => build({ template: 'five-two-legs', equipment: 'dumbbell', variants: { 'chest-press': 'bench' } }),
    /widerspricht/,
  )
  for (const options of [
    { equipment: 'unknown' },
    { equipment: '' },
    { goal: '' },
    { days: 0 },
    { days: 7 },
    { days: 'three' },
    { days: 2.5 },
  ])
    assert.throws(() => build(options))
  const r = cli('Daniel', '--level', 'beginner', '--goal', 'vitality', '--equipment', 'dumbbell', '--days', '3')
  assert.equal(r.status, 2)
  assert.equal(r.stdout, '')
  assert.match(r.stderr, /Keine passende Vorlage/)
  const custom = structuredClone(catalog)
  const home = custom.templates.find((t) => t.id === 'home-dumbbell')
  home.routines[0].exercises[0] = { selector: 'chest-press', role: 'main' }
  const adapted = build({ template: home.id, equipment: 'dumbbell' }, custom)
  assert.equal(adapted.generator.choices['chest-press'], 'pushup')
  assert.equal(adapted.routines[0].exercises.length, home.routines[0].exercises.length)
})

test('template equipment contracts apply to defaults, variants, CLI and UI presets', () => {
  for (const t of catalog.templates) {
    const preset = planFromPreset(t.id)
    const generated = build({ template: t.id })
    for (const plan of [preset, generated])
      for (const routine of plan.routines)
        for (const e of routine.exercises) {
          const actual = [
            ...e.equipment.map((item) => (item === 'body only' ? 'bodyweight' : item)),
            ...(e.requires || []),
          ]
          assert(
            actual.every((item) => t.equipment.includes(item)),
            `${t.id}/${e.name}`,
          )
        }
    const selectors = [...new Set(t.routines.flatMap((r) => r.exercises.map((e) => e.selector).filter(Boolean)))]
    for (const key of selectors)
      for (const choice of catalog.selectors[key].choices) {
        const e = catalog.exercises[choice]
        const allowed = [
          ...e.equipment.map((item) => (item === 'body only' ? 'bodyweight' : item)),
          ...(e.requires || []),
        ].every((item) => t.equipment.includes(item))
        if (allowed) assert(build({ template: t.id, variants: { [key]: choice } }))
        else assert.throws(() => build({ template: t.id, variants: { [key]: choice } }), /Equipment unpassend/)
      }
  }
  const home = build({ template: 'home-dumbbell' })
  assert(
    !home.equipment.some((item) => ['barbell', 'cable', 'bench', 'kettlebells', 'adjustable-bench'].includes(item)),
  )
  assert.equal(home.routines[0].exercises[0].yuhonas_id, 'Dumbbell_Floor_Press')
  const bw = build({ template: 'bodyweight-vital' })
  assert(bw.equipment.every((item) => ['bodyweight', 'mat'].includes(item)))
  assert.throws(() => build({ template: 'full-body', equipment: 'dumbbell' }), /Equipment/)
  const data = structuredClone(catalog)
  data.templates = [
    {
      ...data.templates.find((t) => t.id === 'home-dumbbell'),
      equipment: catalog.equipmentProfiles.gym.items,
      routines: [{ day: 1, label: 'Equipment check', exercises: [{ selector: 'chest-press', role: 'main' }] }],
    },
  ]
  for (const l of Object.keys(data.levels)) data.defaults[l] = 'home-dumbbell'
  const noBench = build({ template: 'home-dumbbell', equipment: 'dumbbell' }, data)
  assert(!noBench.equipment.includes('bench'))
  const bench = build(
    { template: 'home-dumbbell', equipment: 'dumbbell,bench', variants: { 'chest-press': 'bench-db' } },
    data,
  )
  assert(bench.equipment.includes('bench'))
  assert.throws(
    () => build({ template: 'home-dumbbell', equipment: 'dumbbell', variants: { 'chest-press': 'bench-db' } }, data),
    /Equipment/,
  )
  assert.deepEqual(catalog.exercises['goblet-squat'].equipment, ['kettlebells'])
  assert.deepEqual(catalog.exercises['goblet-squat-db'].equipment, ['dumbbell'])
  assert(catalog.exercises['goblet-squat-db'].sourceVariation)
})

test('holds, mobility and motor-control prescriptions survive exports and UI presets', () => {
  for (const level of Object.keys(catalog.levels)) {
    const plan = build({ template: 'home-dumbbell', level })
    const plank = plan.routines.flatMap((r) => r.exercises).find((e) => e.yuhonas_id === 'Plank')
    assert.equal(plank.templateSets[0].targetDuration, { beginner: 15, intermediate: 25, advanced: 35 }[level])
    assert.equal(plank.templateSets[0].targetReps, null)
    assert.equal(plank.rir, null)
    assert.match(workoutPlanMarkdown(plan), /× (15|25|35) s/)
    const main = plan.routines[0].exercises[0]
    assert.equal(main.templateSets[0].targetReps, '8-12')
    assert.equal(main.templateSets.length, level === 'beginner' ? 2 : 3)
  }
  const preset = planFromPreset('home-dumbbell')
  assert(
    preset.routines
      .flatMap((r) => r.exercises)
      .some((e) => e.trackingType === 'duration' && e.templateSets[0].targetDuration > 0),
  )
  const cat = build({ template: 'mobility-flow' }).routines[0].exercises.find((e) => e.yuhonas_id === 'Cat_Stretch')
  assert.equal(cat.templateSets[0].targetDuration, 15)
  assert.equal(cat.templateSets[0].targetReps, null)
  const cliPlan = cli('Audit', '--level', 'beginner', '--goal', 'balance', '--equipment', 'balance', '--format', 'yaml')
  assert.equal(cliPlan.status, 0, cliPlan.stderr)
  const balance = loadYaml(cliPlan.stdout)
  assert.equal(balance.generator.templateId, 'balance-stability')
  assert.equal(balance.core, null)
  assert(
    balance.routines
      .flatMap((r) => r.exercises)
      .every((e) => e.role === 'skill' && e.rir === null && e.coaching.beginner && e.regression && e.progression),
  )
  assert(balance.routines[0].exercises.some((e) => e.trackingType === 'duration'))
  assert(balance.routines[0].exercises.some((e) => e.trackingType === 'bodyweight_reps'))
  assert.throws(() => build({ goal: 'balance', equipment: 'bodyweight' }), /fehlt: feste Haltemöglichkeit/)
  const combined = build({ template: 'strength-stability', equipment: 'dumbbell,stable-support' })
  assert(combined.routines.every((r) => r.exercises.some((e) => e.role === 'skill')))
  assert(!combined.equipment.includes('bench'))
  const invalid = structuredClone(catalog)
  invalid.exercises.plank.prescriptions.beginner.durationSeconds = 0
  assert.throws(() => validateWorkoutCatalog(invalid), /Zeitvorgabe/)
  const slotOverride = structuredClone(catalog)
  slotOverride.templates.find((t) => t.id === 'home-dumbbell').routines[0].exercises[0].prescriptions = {
    beginner: { sets: 1, reps: '6-8' },
  }
  assert.equal(
    build({ template: 'home-dumbbell', level: 'beginner' }, slotOverride).routines[0].exercises[0].templateSets.length,
    1,
  )
})

test('listed variants and published snapshots keep the generator contract', () => {
  const listed = JSON.parse(cli('--list', '--format', 'json').stdout)
  assert(listed.equipmentProfiles.dumbbell.items.includes('dumbbell'))
  assert(!listed.equipmentProfiles.dumbbell.items.includes('bench'))
  for (const t of catalog.templates) {
    assert.deepEqual(listed.templates.find((entry) => entry.id === t.id).variants, workoutTemplateChoices(t.id))
  }
  const preset = planFromPreset('balance-stability')
  const snapshot = snapshotOf(preset)
  assert.match(snapshot.description, /feste Haltemöglichkeit/)
  for (const r of snapshot.routines)
    for (const e of r.exercises) {
      assert(e.notes.includes('Leichter:') && e.notes.includes('Schwerer:'))
      const groups = prescriptionGroups(e)
      if (e.trackingType === 'duration') assert.match(repetitionLabel(groups[0]), / s$/)
      else assert.equal(groups[0].duration, null)
    }
})
