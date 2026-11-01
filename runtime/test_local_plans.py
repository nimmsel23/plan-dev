import json
import tempfile
import unittest
from pathlib import Path
from local_plans import LocalPlans, PlanError, markdown

class LocalPlansTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root/'client').mkdir()
        (self.root/'client/client.json').write_text(json.dumps({'name':'Test client','firebase_uid':'firebase-test'}))
        self.store = LocalPlans(self.root)
        self.body = {'name':'Plan', 'totalWeeks':8, 'routines':[{'id':'day', 'label':'A', 'exercises':[{'id':'ex','name':'Bench','rest_seconds':0,'templateSets':[{'targetReps':'8-12','targetWeight':60}]}]}]}

    def test_draft_release_reopen_conflict_and_delivery(self):
        plan = self.store.create('client', self.body)
        released = self.store.release('client', plan['id'], {'expectedUpdatedAt':plan['updatedAt']})
        changed = self.store.save('client', plan['id'], {**self.body,'name':'Private edit','expectedUpdatedAt':released['updatedAt']})
        self.assertEqual(changed['published']['name'], 'Plan')
        with self.assertRaises(PlanError): self.store.save('client', plan['id'], {**self.body,'expectedUpdatedAt':plan['updatedAt']})
        payload = self.store.delivery_payload('client', plan['id'])
        self.assertEqual(payload['snapshot']['name'], 'Plan')
        self.assertEqual(payload['clientUid'], 'firebase-test')
        self.assertEqual(self.store.versions('client',plan['id'])[0]['number'], 1)
        self.assertIn('Pause: 0 s', markdown(plan))
        self.assertEqual(LocalPlans(self.root).get('client',plan['id'])['name'], 'Private edit')
        self.store.delivered('client',plan['id'],1,{'planId':'remote','version':1})
        self.assertEqual(self.store.get('client',plan['id'])['updatedAt'], changed['updatedAt'])

    def test_registry_boundary_and_no_implicit_migration(self):
        self.assertEqual(len(self.store.clients()), 1)
        with self.assertRaises(PlanError): self.store.list('../other')
        plan = self.store.create('client', {'name':'Empty'})
        with self.assertRaises(PlanError): self.store.release('client',plan['id'],{'expectedUpdatedAt':plan['updatedAt']})
        self.assertFalse((self.root/'client/data/plan.json').exists())
        with self.assertRaises(PlanError): self.store.get('client','../client.json')

if __name__ == '__main__': unittest.main()
