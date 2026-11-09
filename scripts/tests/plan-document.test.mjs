import test from 'node:test'
import assert from 'node:assert/strict'
import {
  prescriptionGroups,
  pauseLabel,
  frequencyLabel,
  repetitionLabel,
} from '../../src/views/Plan/lib/planDocument.js'
test('plan document groups actual prescriptions and preserves warm-up and failure sets', () => {
  const result = prescriptionGroups({
    templateSets: [
      { setType: 'warmup', targetReps: 20 },
      { targetReps: 5 },
      { targetReps: 5 },
      { setType: 'failure', targetReps: 'bis zum Versagen' },
    ],
  })
  assert.deepEqual(
    result.map((g) => [g.type, g.count, g.reps]),
    [
      ['warmup', 1, 20],
      ['normal', 2, 5],
      ['failure', 1, 'bis zum Versagen'],
    ],
  )
})
test('unknown values remain unknown; zero weight and zero pause remain valid', () => {
  assert.equal(prescriptionGroups({ prescriptionIncomplete: true, target_reps: '15–20' })[0].count, null)
  assert.equal(prescriptionGroups({})[0].count, null)
  assert.equal(prescriptionGroups({ templateSets: [{ targetReps: 10, targetWeight: 0 }] })[0].weight, 0)
  assert.equal(pauseLabel({ rest_seconds: 0 }), '0 s')
  assert.equal(pauseLabel({ rest_seconds: '' }), 'offen')
  assert.equal(pauseLabel({ restLabel: '2–3 Minuten', rest_seconds: '' }), '2–3 Minuten')
  assert.equal(
    frequencyLabel([
      { targetCount: 1, targetPeriodDays: 7 },
      { targetCount: 1, targetPeriodDays: 7 },
    ]),
    '2 Einheiten / Woche',
  )
})

test('long failure prescriptions have a readable display without changing the source', () => {
  const group = { reps: 'bis zum momentanen Muskelversagen' }
  assert.equal(repetitionLabel(group), 'bis Versagen')
  assert.equal(group.reps, 'bis zum momentanen Muskelversagen')
  assert.equal(repetitionLabel({ duration: 0 }), '0 s')
})
