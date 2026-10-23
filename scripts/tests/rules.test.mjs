// Firestore-Rules-Vertrag für Pläne gegen den lokalen Emulator.
// Start: bash scripts/tests/run-rules.sh   (RULES_FILE überschreibt die geprüfte Rules-Datei)
import test, { before, after, beforeEach } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rulesFile = process.env.RULES_FILE || path.join(root, 'firestore.rules');
const COACH = 'coachUid1', CLIENT = 'clientUid1', OTHER = 'otherUid1';
let env;

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-plan-rules', firestore: { host: '127.0.0.1', port: 8099, rules: fs.readFileSync(rulesFile, 'utf8') } });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'roles', COACH), { role: 'coach' });
    await setDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan'), { name: 'PPL', coachUid: COACH, status: 'published', headVersion: 1, published: { name: 'PPL' } });
    await setDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan', 'versions', 'v1'), { number: 1, snapshot: { name: 'PPL' } });
    await setDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'ownPlan'), { name: 'Mein Plan', coachUid: CLIENT, status: 'published' });
  });
});
const as = (uid, claims = {}) => env.authenticatedContext(uid, claims).firestore();

test('Klient liest seinen Coach-Plan, schreibt aber nichts daran', async () => {
  const db = as(CLIENT);
  await assertSucceeds(getDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan')));
  await assertFails(updateDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan'), { published: { name: 'gefälscht' } }));
  await assertFails(updateDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan'), { status: 'draft' }));
  await assertFails(deleteDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan')));
});

test('Klient kann Versionen weder ändern, löschen noch erfinden', async () => {
  const db = as(CLIENT);
  await assertSucceeds(getDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan', 'versions', 'v1')));
  await assertFails(setDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan', 'versions', 'v1'), { number: 1, snapshot: { name: 'x' } }));
  await assertFails(deleteDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan', 'versions', 'v1')));
  await assertFails(setDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan', 'versions', 'v9'), { number: 9 }));
});

test('Klient kann keinen Plan mit fremdem coachUid anlegen oder umetikettieren', async () => {
  const db = as(CLIENT);
  await assertFails(setDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'fake'), { name: 'Fake', coachUid: COACH, status: 'published' }));
  await assertFails(updateDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'ownPlan'), { coachUid: COACH }));
});

test('Self-Service bleibt möglich: eigener Plan inkl. Version', async () => {
  const db = as(CLIENT);
  await assertSucceeds(setDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'new'), { name: 'Neu', coachUid: CLIENT, status: 'draft' }));
  await assertSucceeds(updateDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'ownPlan'), { description: 'ok' }));
  await assertSucceeds(setDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'ownPlan', 'versions', 'v1'), { number: 1 }));
  await assertSucceeds(deleteDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'ownPlan')));
});

test('Klient schreibt weiterhin Workouts und Completions', async () => {
  const db = as(CLIENT);
  await assertSucceeds(setDoc(doc(db, 'fitness', CLIENT, 'workouts', 'w1'), { name: 'Push' }));
  await assertSucceeds(setDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan', 'completions', 'c1'), { routineId: 'r' }));
  await assertSucceeds(getDocs(collection(db, 'fitness', CLIENT, 'macrocycles')));
});

test('Fremde Nutzer haben keinen Zugriff auf Klientendaten', async () => {
  const db = as(OTHER);
  await assertFails(getDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan')));
  await assertFails(setDoc(doc(db, 'fitness', CLIENT, 'workouts', 'w2'), { name: 'x' }));
});

test('Coach darf Pläne und Versionen beim Klienten voll bearbeiten', async () => {
  const db = as(COACH);
  await assertSucceeds(updateDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan'), { headVersion: 2 }));
  await assertSucceeds(setDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan', 'versions', 'v2'), { number: 2 }));
  await assertSucceeds(deleteDoc(doc(db, 'fitness', CLIENT, 'macrocycles', 'coachPlan', 'versions', 'v2')));
});
