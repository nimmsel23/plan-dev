import { db } from '../../../firebase.js'
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'

// Makrozyklen — Firestore-Pendant. Collection: fitness/{clientUid}/macrocycles/{id}
// Completions: fitness/{clientUid}/macrocycles/{id}/completions/{completionId}

async function loadDoc(clientUid, cycleId) {
  const snap = await getDoc(doc(db, 'fitness', clientUid, 'macrocycles', cycleId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
async function saveDoc(clientUid, macrocycle) {
  const record = { ...macrocycle, updatedAt: new Date().toISOString() }
  await setDoc(doc(db, 'fitness', clientUid, 'macrocycles', macrocycle.id), record, { merge: true })
  return record
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
      const { routines, ...rest } = d.data()
      return { id: d.id, ...rest, routineCount: (routines || []).length }
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

export async function createMacrocycle(clientUid, { name, coachUid, totalWeeks, status = "published" }) {
  try {
    const ref = doc(collection(db, 'fitness', clientUid, 'macrocycles'))
    const record = {
      name, clientUid, coachUid, status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalWeeks: Number(totalWeeks) || 10,
      routines: [],
    }
    await setDoc(ref, record)
    return { id: ref.id, ...record }
  } catch (error) {
    console.error('Error creating macrocycle:', error)
    return null
  }
}

export async function deleteMacrocycle(clientUid, cycleId) {
  try {
    await deleteDoc(doc(db, 'fitness', clientUid, 'macrocycles', cycleId))
    return true
  } catch (error) {
    console.error('Error deleting macrocycle:', error)
    return false
  }
}

export async function addRoutine(clientUid, cycleId, { label, isDeload, restHoursAfter, targetCount, targetPeriodDays, sourceTemplateId, exercises = [] }) {
  try {
    const m = await loadDoc(clientUid, cycleId)
    if (!m) return null
    m.routines = [...(m.routines || []), {
      id: `rt_${Math.random().toString(16).slice(2, 10)}`,
      label,
      isDeload: !!isDeload,
      restHoursAfter: Number(restHoursAfter) || 0,
      targetCount: Number(targetCount) || 0,
      targetPeriodDays: Number(targetPeriodDays) || 0,
      sourceTemplateId: sourceTemplateId || null,
      exercises,
    }]
    return await saveDoc(clientUid, m)
  } catch (error) {
    console.error('Error adding routine:', error)
    return null
  }
}

export async function updateRoutine(clientUid, cycleId, routineId, patch) {
  try {
    const m = await loadDoc(clientUid, cycleId)
    if (!m) return null
    m.routines = (m.routines || []).map(r => r.id === routineId ? { ...r, ...patch } : r)
    return await saveDoc(clientUid, m)
  } catch (error) {
    console.error('Error updating routine:', error)
    return null
  }
}

export async function deleteRoutine(clientUid, cycleId, routineId) {
  try {
    const m = await loadDoc(clientUid, cycleId)
    if (!m) return null
    m.routines = (m.routines || []).filter(r => r.id !== routineId)
    return await saveDoc(clientUid, m)
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

// Explicit publication of a client plan; existing records without status stay visible.
export async function publishMacrocycle(clientUid, cycleId) {
  const m = await loadDoc(clientUid, cycleId);
  if (!m?.routines?.length || m.routines.some((r) => !r.exercises?.length)) throw new Error('Jede Einheit braucht Übungen, bevor du den Plan bereitstellst.');
  return saveDoc(clientUid, { ...m, status: 'published', publishedAt: new Date().toISOString() });
}
