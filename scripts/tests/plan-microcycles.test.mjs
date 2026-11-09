import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeMicrocycles,
  microcycleTimeline,
  microcycleForWeek,
  applyMicrocycleToExercise,
  microcycleSummary,
  microcyclesTotalWeeks,
  isDeloadWeek,
} from '../../src/views/Plan/lib/microcycles.js'
import { snapshotOf, sameSnapshot } from '../../src/views/Plan/lib/planVersions.js'

test('normalizeMicrocycles: Defaults, Klammern, Müll, Gesamtkappung', () => {
  const p = normalizeMicrocycles([
    { id: 'a', kind: 'build', weeks: 3 },
    { kind: 'deload', weeks: '1', volumePct: 999, rirDelta: -9 },
    'x',
    { kind: 'zzz', weeks: 200 },
  ])
  assert.deepEqual(
    p.map((x) => [x.kind, x.weeks]),
    [
      ['build', 3],
      ['deload', 1],
      ['base', 52],
    ],
  )
  assert.equal(p[0].volumePct, 110)
  assert.equal(p[1].volumePct, 150)
  assert.equal(p[1].rirDelta, -3)
  assert.equal(microcyclesTotalWeeks(p), 56)
  assert.deepEqual(normalizeMicrocycles(null), [])
  assert.equal(microcyclesTotalWeeks(normalizeMicrocycles([{ weeks: 100 }, { weeks: 50 }, { weeks: 50 }])), 104)
})

test('Zeitleiste und microcycleForWeek (nach Ende gilt die letzte Mikrozyklus)', () => {
  const ph = [
    { id: 'a', kind: 'build', weeks: 3 },
    { id: 'b', kind: 'deload', weeks: 1 },
  ]
  assert.deepEqual(
    microcycleTimeline(ph).map((x) => [x.startWeek, x.endWeek]),
    [
      [1, 3],
      [4, 4],
    ],
  )
  assert.equal(microcycleForWeek(ph, 3).id, 'a')
  assert.equal(microcycleForWeek(ph, 4).id, 'b')
  assert.equal(microcycleForWeek(ph, 99).id, 'b')
  assert.equal(microcycleForWeek([], 2), null)
  assert.equal(isDeloadWeek(ph, 4), true)
  assert.equal(isDeloadWeek(ph, 1), false)
})

test('applyMicrocycleToExercise: Sätze und RIR, ohne Mutation, nichts erfunden', () => {
  const ex = {
    name: 'Bank',
    rir: 2,
    templateSets: [{ targetReps: 8 }, { targetReps: 8 }, { targetReps: 8 }, { targetReps: 8 }, { targetReps: 8 }],
  }
  const dl = applyMicrocycleToExercise(ex, { volumePct: 60, rirDelta: 2 })
  assert.equal(dl.templateSets.length, 3)
  assert.equal(dl.target_sets, 3)
  assert.equal(dl.rir, 4)
  assert.equal(ex.templateSets.length, 5)
  assert.equal(ex.rir, 2)
  const up = applyMicrocycleToExercise(
    { templateSets: [{ targetReps: 5 }, { targetReps: 5 }] },
    { volumePct: 150, rirDelta: -1 },
  )
  assert.equal(up.templateSets.length, 3)
  assert.deepEqual(
    up.templateSets.map((s) => s.setIndex),
    [0, 1, 2],
  )
  assert.equal(up.rir, undefined)
  assert.equal(applyMicrocycleToExercise({ target_sets: 4 }, { volumePct: 50, rirDelta: 0 }).target_sets, 2)
  assert.equal(applyMicrocycleToExercise({ name: 'x' }, null).name, 'x')
})

test('Snapshot: Mikrozyklen nur wenn vorhanden und versionsrelevant', () => {
  const base = { name: 'P', routines: [] }
  assert.equal('microcycles' in snapshotOf(base), false)
  const a = snapshotOf({ ...base, microcycles: [{ id: 'a', kind: 'build', weeks: 2 }] })
  const b = snapshotOf({ ...base, microcycles: [{ id: 'a', kind: 'peak', weeks: 2 }] })
  assert.equal(sameSnapshot(a, b), false)
  assert.equal(sameSnapshot(a, snapshotOf({ ...base, microcycles: [{ id: 'a', kind: 'build', weeks: 2 }] })), true)
})

test('microcycleSummary', () => {
  assert.match(
    microcycleSummary([{ id: 'a', kind: 'deload', weeks: 1 }], 1),
    /Woche 1\/1 · Deload \(60 % Volumen, RIR \+2\)/,
  )
  assert.equal(microcycleSummary([], 1), '')
})

test('planWeek: ab Veröffentlichung, nie unter 1', async () => {
  const { planWeek } = await import('../../src/views/Plan/lib/microcycles.js')
  const now = new Date('2026-11-05T12:00:00Z')
  assert.equal(planWeek({ publishedAt: '2026-11-05T08:00:00Z' }, now), 1)
  assert.equal(planWeek({ publishedAt: '2026-10-22T08:00:00Z' }, now), 3)
  assert.equal(planWeek({ publishedAt: '2027-01-01T00:00:00Z' }, now), 1)
  assert.equal(planWeek({}, now), 1)
})

test('Gewichtsprogression: +% pro Woche in der Mikrozyklus, 0,5-kg-Raster, Woche 1 unverändert', async () => {
  const {
    progressedWeight,
    microcycleForWeek: pfw,
    applyMicrocycleToExercise: ap,
  } = await import('../../src/views/Plan/lib/microcycles.js')
  const ph = [
    { id: 'a', kind: 'build', weeks: 1 },
    { id: 'b', kind: 'build', weeks: 3, volumePct: 100, rirDelta: 0, weeklyWeightPct: 5 },
  ]
  const microcycle = pfw(ph, 4) // Woche 3 der Mikrozyklus b
  assert.equal(progressedWeight(100, microcycle, 4), 110.5)
  assert.equal(progressedWeight(100, pfw(ph, 2), 2), 100)
  assert.equal(progressedWeight('', microcycle, 4), '')
  assert.equal(progressedWeight(null, microcycle, 4), null)
  const ex = ap({ target_weight: 40, templateSets: [{ targetWeight: 40 }, { targetReps: 5 }] }, microcycle, 4)
  assert.equal(ex.templateSets[0].targetWeight, 44)
  assert.equal(ex.templateSets[1].targetWeight, undefined)
  assert.equal(ex.target_weight, 44)
})

// Altdaten: das Feld hieß bis 2026-11-05 `phases`.
{
  const { withMicrocycles } = await import('../../src/views/Plan/lib/microcycles.js')
  const legacy = withMicrocycles({
    id: 'x',
    phases: [{ id: 'a', kind: 'base', weeks: 2 }],
    published: { phases: [{ id: 'a', kind: 'base', weeks: 2 }] },
  })
  assert.equal(legacy.phases, undefined)
  assert.equal(legacy.microcycles[0].id, 'a')
  assert.equal(legacy.published.microcycles[0].id, 'a')
  assert.deepEqual(withMicrocycles({ microcycles: [1], phases: [2] }).microcycles, [1])
  console.log('withMicrocycles (Altdaten) ok')
}
