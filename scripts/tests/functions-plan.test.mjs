import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { shouldNotifyPlanPublished, planPushContent } = createRequire(import.meta.url)('../../functions/planPublished.js');

test('push only for a newly published coach plan', () => {
  const pub = { status: 'published', publishedAt: 't1', coachUid: 'coach' };
  assert.equal(shouldNotifyPlanPublished('client', undefined, pub), true);
  assert.equal(shouldNotifyPlanPublished('client', { ...pub, status: 'draft', publishedAt: undefined }, pub), true);
  assert.equal(shouldNotifyPlanPublished('client', pub, { ...pub, description: 'neu' }), false); // Hinweis geändert
  assert.equal(shouldNotifyPlanPublished('client', pub, { ...pub, publishedAt: 't2' }), true);   // erneut bereitgestellt
  assert.equal(shouldNotifyPlanPublished('client', undefined, { ...pub, status: 'draft' }), false);
  assert.equal(shouldNotifyPlanPublished('coach', undefined, pub), false);                       // eigener Plan
  assert.equal(shouldNotifyPlanPublished('client', pub, undefined), false);                      // gelöscht
  assert.equal(shouldNotifyPlanPublished('client', undefined, { ...pub, coachUid: undefined }), false);
});

test('push only for a newer publishedAt', () => {
  const pub = { status: 'published', publishedAt: '2026-10-22T10:00:00.000Z', coachUid: 'coach' };
  assert.equal(shouldNotifyPlanPublished('client', pub, { ...pub, publishedAt: '2026-10-22T09:00:00.000Z' }), false); // älter
  assert.equal(shouldNotifyPlanPublished('client', pub, { ...pub, publishedAt: '2026-10-22T11:00:00.000Z' }), true);
});

test('push text uses published name and version', () => {
  assert.deepEqual(planPushContent({ name: 'Arbeitsname', published: { name: 'PPL' }, headVersion: 1 }), { type: 'planPublished', vars: { plan: 'PPL' } });
  assert.deepEqual(planPushContent({ name: 'PPL' }), { type: 'planPublished', vars: { plan: 'PPL' } });
  assert.deepEqual(planPushContent({ name: 'X', published: { name: 'PPL' }, headVersion: 3, headMessage: 'Beine ergänzt' }), { type: 'planUpdated', vars: { plan: 'PPL', detail: 'v3: Beine ergänzt' } });
  assert.deepEqual(planPushContent({ name: 'PPL', headVersion: 2 }).vars.detail, 'v2');
});
