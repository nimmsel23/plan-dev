import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { shouldNotifyPlanPublished } = createRequire(import.meta.url)('../../functions/planPublished.js');

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
