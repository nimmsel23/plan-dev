import { db } from '../../../firebase.js'
import { snapshotOf, sameSnapshot } from '../../../views/Plan/lib/planVersions.js'
import {
  doc,
  collection,
  query,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { getDoc, setDoc, getDocs, writeBatch } from './offline.js';// Makrozyklen — Firestore-Pendant. Collection: fitness/{clientUid}/macrocycles/{id}
// Completions: fitness/{clientUid}/macrocycles/{id}/completions/{completionId}

const planRef = (clientUid, cycleId) => doc(db, 'fitness', clientUid, 'macrocycles', cycleId)
async function loadDoc(clientUid, cycleId) {
  const snap = await getDoc(planRef(clientUid, cycleId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
// Lesen-Ändern-Schreiben in einer Transaktion: fn(m) liefert nur die geänderten Felder,
// so überschreibt kein veralteter Gesamtstand `published`/`headVersion`/`status`.
async function mutate(clientUid, cycleId, fn) {
  return runTransaction(db, async (tx) => {
    const ref = planRef(clientUid, cycleId)
    const snap = await tx.get(ref)
    if (!snap.exists()) return null
    const m = { id: snap.id, ...snap.data() }
    const fields = { ...(await fn(m, tx)), updatedAt: new Date().toISOString() }
    tx.update(ref, fields)
    return { ...m, ...fields }
  })
}
const normWeekdays = (value) => Array.isArray(value)
  ? [...new Set(value.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((x, y) => x - y)
  : []
const clone = (value) => JSON.parse(JSON.stringify(value))
function newRoutine(r = {}) {
  return {
    id: `rt_${Math.random().toString(16).slice(2, 10)}`,
    label: r.label,
    isDeload: !!r.isDeload,
    restHoursAfter: Number(r.restHoursAfter) || 0,
    targetCount: Number(r.targetCount) || 0,
    targetPeriodDays: Number(r.targetPeriodDays) || 0,
    sourceTemplateId: r.sourceTemplateId || null,
    weekdays: normWeekdays(r.weekdays),
    exercises: Array.isArray(r.exercises) ? clone(r.exercises) : [],
  }
}
async function loadCompletions(clientUid, cycleId) {
  const ref = collection(db, 'fitness', clientUid, 'macrocycles', cycleId, 'completions')
  const snap = await getDocs(query(ref, orderBy('completedAt', 'asc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function listMacrocycles(clientUid) {
  try {
    const ref = collection(db, 'fitness', clientUid, 'macrocycles')
    const snap = await getDocs(query(ref, orderBy('createdAt', 'desc')))
    return snap.docs.map(d => {
      const { routines, published, ...rest } = d.data()
      const working = (routines || []).length
      return { id: d.id, ...rest, routineCount: published ? (published.routines || []).length : working, workingRoutineCount: working }
    })
  } catch (error) {
    console.error('Error listing macrocycles:', error)
    return []
  }
}

export async function getMacrocycle(clientUid, cycleId) {
  try {
    const macrocycle = await loadDoc(clientUid, cycleId)
    if (!macrocycle) return null
    const completions = await loadCompletions(clientUid, cycleId)
    const nextRoutineIndex = macrocycle.routines?.length ? completions.length % macrocycle.routines.length : 0

    let restingUntil = null
    if (completions.length) {
      const last = completions[completions.length - 1]
      const lastRoutine = macrocycle.routines?.find(r => r.id === last.routineId)
      const restHours = lastRoutine?.restHoursAfter || 0
      if (restHours) {
        const readyAt = new Date(last.completedAt).getTime() + restHours * 3600 * 1000
        if (readyAt > Date.now()) restingUntil = new Date(readyAt).toISOString()
      }
    }

    const totalWeeks = macrocycle.totalWeeks || 10
    const elapsedWeeks = Math.floor((Date.now() - new Date(macrocycle.createdAt).getTime()) / (7 * 86400000))
    const currentWeek = Math.min(elapsedWeeks + 1, totalWeeks)

    return { ok: true, macrocycle, completions, nextRoutineIndex, restingUntil, currentWeek, totalWeeks, finished: elapsedWeeks >= totalWeeks }
  } catch (error) {
    console.error('Error fetching macrocycle:', error)
    return null
  }
}

export async function createMacrocycle(clientUid, { name, coachUid, totalWeeks, status = 'draft', description = '', routines = [] }) {
  try {
    const ref = doc(collection(db, 'fitness', clientUid, 'macrocycles'))
    const record = {
      name, clientUid, coachUid, status, description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalWeeks: Number(totalWeeks) || 10,
      routines: (Array.isArray(routines) ? routines : []).map(newRoutine),
    }
    await setDoc(ref, record)
    return { id: ref.id, ...record }
  } catch (error) {
    console.error('Error creating macrocycle:', error)
    return null
  }
}

// Plan samt Versionen und Completions in Batches entfernen (Plan-Dokument zuletzt).
export async function deleteMacrocycle(clientUid, cycleId) {
  try {
    const sub = async (name) => (await getDocs(collection(db, 'fitness', clientUid, 'macrocycles', cycleId, name))).docs
    const refs = [...await sub('versions'), ...await sub('completions')].map((d) => d.ref)
    for (let i = 0; i < refs.length; i += 400) {
      const batch = writeBatch(db)
      refs.slice(i, i + 400).forEach((ref) => batch.delete(ref))
      await batch.commit()
    }
    const last = writeBatch(db)
    last.delete(planRef(clientUid, cycleId))
    await last.commit()
    return true
  } catch (error) {
    console.error('Error deleting macrocycle:', error)
    return false
  }
}

export async function addRoutine(clientUid, cycleId, routine) {
  try {
    return await mutate(clientUid, cycleId, (m) => ({ routines: [...(m.routines || []), newRoutine(routine)] }))
  } catch (error) {
    console.error('Error adding routine:', error)
    return null
  }
}

export async function updateRoutine(clientUid, cycleId, routineId, patch) {
  try {
    const clean = 'weekdays' in patch ? { ...patch, weekdays: normWeekdays(patch.weekdays) } : patch
    return await mutate(clientUid, cycleId, (m) => ({ routines: (m.routines || []).map((r) => r.id === routineId ? { ...r, ...clean } : r) }))
  } catch (error) {
    console.error('Error updating routine:', error)
    return null
  }
}

export async function deleteRoutine(clientUid, cycleId, routineId) {
  try {
    return await mutate(clientUid, cycleId, (m) => ({ routines: (m.routines || []).filter((r) => r.id !== routineId) }))
  } catch (error) {
    console.error('Error deleting routine:', error)
    return null
  }
}

export async function completeRoutine(clientUid, cycleId, routineId, exercises) {
  try {
    const ref = doc(collection(db, 'fitness', clientUid, 'macrocycles', cycleId, 'completions'))
    const record = { routineId, completedAt: new Date().toISOString(), exercises: exercises || [] }
    await setDoc(ref, record)
    return { id: ref.id, ...record }
  } catch (error) {
    console.error('Error completing routine:', error)
    return null
  }
}

export async function getLastPerformance(clientUid, cycleId, routineId) {
  try {
    const completions = await loadCompletions(clientUid, cycleId)
    const matches = completions.filter(c => c.routineId === routineId)
    return matches[matches.length - 1] || null
  } catch (error) {
    console.error('Error fetching last performance:', error)
    return null
  }
}

// Veröffentlichen = Commit: unveränderlicher Snapshot unter versions/vN + `published` am Plan.
// Klienten lesen `published`; der Plan selbst bleibt der Arbeitsstand des Coaches.
// Versionsnummer, Version (create-Semantik) und Plan-Update laufen in einer Transaktion.
export async function publishMacrocycle(clientUid, cycleId, { message = '', author = null } = {}) {
  const result = await updateMacrocycle(clientUid, cycleId, { status: 'published', message, author });
  if (!result) throw new Error('Plan nicht gefunden.');
  return result;
}

export async function listPlanVersions(clientUid, cycleId) {
  const snap = await getDocs(collection(db, 'fitness', clientUid, 'macrocycles', cycleId, 'versions'));
  return snap.docs.map((d) => d.data()).sort((x, y) => x.number - y.number);
}

// Lesebestätigung: der Klient hat Version N seines Plans gesehen (je Version einmalig, unveränderlich).
export async function markPlanRead(clientUid, cycleId, version) {
  const n = Number(version);
  if (!Number.isInteger(n) || n < 1) return false;
  const ref = doc(db, 'fitness', clientUid, 'macrocycles', cycleId, 'receipts', `v${n}`);
  try {
    if ((await getDoc(ref)).exists()) return true;
    await setDoc(ref, { planId: cycleId, version: n, readAt: new Date().toISOString() });
    return true;
  } catch { return false; }
}

export async function listPlanReceipts(clientUid, cycleId) {
  const snap = await getDocs(collection(db, 'fitness', clientUid, 'macrocycles', cycleId, 'receipts'));
  return snap.docs.map((d) => d.data()).sort((x, y) => x.version - y.version);
}

// Arbeitsstand auf eine frühere Version setzen (Git: checkout); Historie bleibt unberührt.
export async function restorePlanVersion(clientUid, cycleId, versionId) {
  return mutate(clientUid, cycleId, async (m, tx) => {
    const snap = await tx.get(doc(db, 'fitness', clientUid, 'macrocycles', cycleId, 'versions', String(versionId)));
    if (!snap.exists()) throw new Error('Version nicht gefunden.');
    const { name, description, totalWeeks, routines } = clone(snap.data().snapshot);
    return { name, description, totalWeeks, routines };
  });
}

// Name, Coach-Hinweis (description) und Status (draft/published) in einem Zug ändern.
// Bei status 'published' gelten Name/Hinweis aus demselben Aufruf bereits für den Snapshot.
export async function updateMacrocycle(clientUid, cycleId, patch = {}) {
  const name = typeof patch.name === 'string' ? patch.name.trim() : null;
  if (name === '') throw new Error('Name erforderlich.');
  return mutate(clientUid, cycleId, async (m, tx) => {
    if ('expectedUpdatedAt' in patch && patch.expectedUpdatedAt !== (m.updatedAt || null)) throw new Error('Der Plan wurde inzwischen geändert. Bitte aktuellen Stand neu öffnen; dein lokaler Entwurf bleibt erhalten.');
    const fields = {};
    if ('totalWeeks' in patch) {
      if (!Number.isInteger(patch.totalWeeks) || patch.totalWeeks < 1 || patch.totalWeeks > 104) throw new Error('Ungültige Plandauer.');
      fields.totalWeeks = patch.totalWeeks;
    }
    if ('routines' in patch) {
      if (!Array.isArray(patch.routines) || patch.routines.some((r) => !r.id || !r.label?.trim() || !Array.isArray(r.exercises)) || new Set(patch.routines.map((r) => r.id)).size !== patch.routines.length) throw new Error('Ungültige Trainingstage.');
      fields.routines = clone(patch.routines);
    }
    if (name !== null) fields.name = name;
    if (typeof patch.description === 'string') fields.description = patch.description.trim().slice(0, 2000);
    if (patch.status === 'draft') fields.status = 'draft';
    if (patch.status === 'published') {
      const work = { ...m, ...fields };
      if (!work.routines?.length || work.routines.some((r) => !r.exercises?.length)) throw new Error('Jede Einheit braucht Übungen, bevor du den Plan bereitstellst.');
      const snap = snapshotOf(work);
      const same = !!m.published && sameSnapshot(snap, m.published);
      if (same && m.status === 'published') throw new Error('Keine Änderungen seit der letzten Version.');
      fields.status = 'published';
      fields.publishedAt = new Date().toISOString();
      if (!same) {
        const number = (m.headVersion || 0) + 1;
        const text = (typeof patch.message === 'string' ? patch.message.trim().slice(0, 200) : '') || (number === 1 ? 'Erste Version' : 'Aktualisiert');
        const record = { id: `v${number}`, number, message: text, createdAt: fields.publishedAt, author: typeof patch.author === 'string' && patch.author ? patch.author : m.coachUid || null, parent: number > 1 ? `v${number - 1}` : null, snapshot: clone(snap) };
        const vref = doc(db, 'fitness', clientUid, 'macrocycles', cycleId, 'versions', record.id);
        if ((await tx.get(vref)).exists()) throw new Error(`Version ${record.id} existiert bereits.`);
        tx.set(vref, record);
        Object.assign(fields, { published: record.snapshot, headVersion: number, headMessage: text });
      }
    }
    return fields;
  });
}
