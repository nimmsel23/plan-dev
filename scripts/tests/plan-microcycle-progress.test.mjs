import test from 'node:test'
import assert from 'node:assert/strict'
import { microcycleProgress, plannedPerWeek } from '../../src/views/Plan/lib/microcycleProgress.js'

const plan = {
  id: 'p',
  publishedAt: '2026-10-19T08:00:00Z',
  routines: [{ weekdays: [0, 3] }, { targetCount: 1, targetPeriodDays: 7 }],
  microcycles: [
    { id: 'a', kind: 'build', weeks: 2 },
    { id: 'b', kind: 'deload', weeks: 1 },
  ],
}
const w = (microcycle, effort, extra = {}) => ({
  sourcePlanId: 'p',
  finished_at: '2026-10-20T10:00:00Z',
  sourcePlanMicrocycle: { id: microcycle },
  feedback: effort ? { effort } : undefined,
  ...extra,
})

test('plannedPerWeek: Wochentage oder Zeitraumziel', () => assert.equal(plannedPerWeek(plan.routines), 3))

test('Fortschritt je Mikrozyklus: Soll, Ist, Ø Anstrengung, Zustand', () => {
  const now = new Date('2026-11-04T12:00:00Z') // Woche 3
  const rows = microcycleProgress(
    plan,
    [
      w('a', 6),
      w('a', 8),
      w('b'),
      { ...w('a'), sourcePlanId: 'x' },
      { ...w('a'), finished_at: null },
      { sourcePlanId: 'p', finished_at: 'x' },
    ],
    now,
  )
  assert.equal(rows[0].state, 'past')
  assert.equal(rows[0].planned, 6)
  assert.equal(rows[0].done, 2)
  assert.equal(rows[0].avgEffort, 7)
  assert.equal(rows[1].state, 'current')
  assert.equal(rows[1].dueSoFar, 3)
  assert.equal(rows[1].done, 1)
  assert.equal(rows[1].avgEffort, null)
})

test('Ohne Mikrozyklen: leer', () => assert.deepEqual(microcycleProgress({ id: 'p', routines: [] }, []), []))
