import { collection, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';

function segment(value) {
  if (typeof value !== 'string' || !value || value.includes('/')) throw new Error('Ungültiger Planbezug.');
  return value;
}
export function responsePath(uid, plan) {
  if (!Number.isInteger(plan?.headVersion) || plan.headVersion < 1) throw new Error('Zuerst eine Planversion bereitstellen.');
  return ['planResponses', segment(uid), 'plans', segment(plan.id), 'versions', `v${plan.headVersion}`];
}
// The host supplies its own authenticated Firebase instance; no sibling app imports.
export function createPlanResponseStore({ db, getActor }) {
  return {
    watchPlans(uid, onChange, onError) {
      return onSnapshot(collection(db, 'fitness', segment(uid), 'macrocycles'), { includeMetadataChanges: true }, (snap) => {
        onChange({ plans: snap.docs.map((item) => ({ id: item.id, ...item.data() })), fromCache: snap.metadata.fromCache });
      }, onError);
    },
    watch(uid, plan, onChange, onError, { latestOnly = false } = {}) {
      const path = responsePath(uid, plan);
      let active = true;
      let state = { receipt: null, entries: [], loading: true, fromCache: true };
      let receiptLoaded = false;
      let entriesLoaded = false;
      let receiptCached = true;
      let entriesCached = true;
      const emit = () => { if (active) onChange({ ...state, loading: !receiptLoaded || !entriesLoaded, fromCache: receiptCached || entriesCached }); };
      const receipt = onSnapshot(doc(db, ...path), { includeMetadataChanges: true }, (snap) => {
        state.receipt = snap.exists() ? { ...snap.data({ serverTimestamps: 'estimate' }), pending: snap.metadata.hasPendingWrites } : null;
        receiptLoaded = true; receiptCached = snap.metadata.fromCache;
        emit();
      }, onError);
      const entries = onSnapshot(query(collection(db, ...path, 'entries'), orderBy('createdAt', 'desc'), limit(latestOnly ? 1 : 50)), { includeMetadataChanges: true }, (snap) => {
        state.entries = snap.docs.map((item) => ({ id: item.id, ...item.data({ serverTimestamps: 'estimate' }), pending: item.metadata.hasPendingWrites })).reverse();
        entriesLoaded = true; entriesCached = snap.metadata.fromCache; emit();
      }, onError);
      return () => { active = false; receipt(); entries(); };
    },
    async confirm(uid, plan) {
      if (getActor()?.uid !== uid) throw new Error('Nur der Klient kann den Empfang bestätigen.');
      const ref = doc(db, ...responsePath(uid, plan));
      await runTransaction(db, async (tx) => {
        if (!(await tx.get(ref)).exists()) tx.set(ref, { readerUid: uid, readAt: serverTimestamp() });
      });
    },
    async send(uid, plan, text, coach = false) {
      const actor = getActor();
      if (!actor?.uid || (!coach && actor.uid !== uid)) throw new Error('Bitte mit deinem Cloud-Konto anmelden.');
      const body = String(text || '').trim();
      if (!body || body.length > 2000) throw new Error('Rückmeldung muss 1 bis 2000 Zeichen enthalten.');
      const ref = doc(collection(db, ...responsePath(uid, plan), 'entries'));
      await setDoc(ref, { body, senderUid: actor.uid, senderRole: coach ? 'coach' : 'client', createdAt: serverTimestamp() });
      return ref.id;
    },
  };
}
