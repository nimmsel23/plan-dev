import { isLocalMode } from '@db'
import { searchExercises as dbSearch } from '@db'
import { filterCatalog, mergeCatalog } from './lib/catalog.js'
import * as fsRoutines from '../../lib/db/firestore/routines.js'
import * as fsWorkouts from '../../lib/db/firestore/workouts.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''

// Lokal (isLocalMode()) läuft alles gegen server.mjs' JSON-Datei-Backend
// (/routines, /workouts). Im Firebase-Build übernimmt firestoreDispatch()
// unten (lib/db/firestore/routines.js + workouts.js) dieselben Pfade als
// Firestore-CRUD — beide Backends sind vollständig implementiert, keines
// ist ein Stub. `db` aus `@db` ist im lokalen Dev-Build `null`, deshalb
// bewusst per isLocalMode()-Weiche getrennt statt einheitlich über @db.
async function localFetch(method, path, body) {
  const res = await fetch(API_BASE + 'api/' + path.replace(/^\/+/, ''), {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const error = new Error(`${method} ${path} → ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json()
}

const LOCAL_GET = [/^\/routines$/, /^\/routines\/[^/]+$/, /^\/workouts$/, /^\/workouts\/[^/]+$/]
const LOCAL_POST = [/^\/routines$/, /^\/routines\/[^/]+\/exercises$/, /^\/workouts$/, /^\/workouts\/[^/]+\/exercises$/, /^\/workouts\/[^/]+\/exercises\/[^/]+\/sets$/]
const LOCAL_PATCH = [/^\/routines\/[^/]+$/, /^\/routines\/[^/]+\/exercises\/[^/]+$/, /^\/workouts\/[^/]+$/, /^\/workouts\/[^/]+\/exercises\/[^/]+\/sets\/[^/]+$/]
const LOCAL_PUT = [/^\/routines\/[^/]+\/exercises\/order$/, /^\/workouts\/[^/]+\/exercises\/order$/]
const LOCAL_DELETE = [/^\/routines\/[^/]+$/, /^\/routines\/[^/]+\/exercises\/[^/]+$/, /^\/workouts\/[^/]+$/, /^\/workouts\/[^/]+\/exercises\/[^/]+$/, /^\/workouts\/[^/]+\/exercises\/[^/]+\/sets\/[^/]+$/]
const DEFAULT_SETTINGS = {
  yuhonas_enabled: 'true',
  wger_enabled: 'false',
  wger_url: 'http://localhost',
  wger_token: '',
}

function matches(path, patterns) { return patterns.some(p => p.test(path)) }

function normalizeSettings(raw = {}) {
  const next = { ...DEFAULT_SETTINGS, ...(raw || {}) }
  if (next.wger_url === 'http://localhost:8000' || next.wger_url === 'http://127.0.0.1:8000') {
    next.wger_url = DEFAULT_SETTINGS.wger_url
  }
  return next
}

// Firebase-Build: Routinen/Workouts gegen Firestore statt server.mjs.
// Gibt eine Promise zurueck wenn der Pfad erkannt wurde, sonst null (Aufrufer
// faellt dann auf den generischen Fallback zurueck statt stillen No-op).
function firestoreDispatch(method, path, body, uid) {
  let m
  if (method === 'GET') {
    if (path === '/routines') return fsRoutines.listRoutines(uid)
    if ((m = path.match(/^\/routines\/([^/]+)$/))) return fsRoutines.getRoutine(m[1], uid)
    if (path === '/workouts') return fsWorkouts.listWorkouts(uid)
    if ((m = path.match(/^\/workouts\/([^/]+)$/))) return fsWorkouts.getWorkout(m[1], uid)
  }
  if (method === 'POST') {
    if (path === '/routines') return fsRoutines.createRoutine(body, uid)
    if ((m = path.match(/^\/routines\/([^/]+)\/exercises$/))) return fsRoutines.addRoutineExercise(m[1], body, uid)
    if (path === '/workouts') return fsWorkouts.createWorkout(body, uid)
    if ((m = path.match(/^\/workouts\/([^/]+)\/exercises$/))) return fsWorkouts.addWorkoutExercise(m[1], body, uid)
    if ((m = path.match(/^\/workouts\/([^/]+)\/exercises\/([^/]+)\/sets$/))) return fsWorkouts.addSet(m[1], m[2], uid)
  }
  if (method === 'PATCH') {
    if ((m = path.match(/^\/routines\/([^/]+)$/))) return fsRoutines.updateRoutine(m[1], body, uid)
    if ((m = path.match(/^\/routines\/([^/]+)\/exercises\/([^/]+)$/))) return fsRoutines.updateRoutineExercise(m[1], m[2], body, uid)
    if ((m = path.match(/^\/workouts\/([^/]+)$/))) return fsWorkouts.updateWorkout(m[1], body, uid)
    if ((m = path.match(/^\/workouts\/([^/]+)\/exercises\/([^/]+)\/sets\/([^/]+)$/))) return fsWorkouts.updateSet(m[1], m[2], m[3], body, uid)
  }
  if (method === 'PUT') {
    if ((m = path.match(/^\/routines\/([^/]+)\/exercises\/order$/))) return fsRoutines.reorderRoutineExercises(m[1], body.order, uid)
    if ((m = path.match(/^\/workouts\/([^/]+)\/exercises\/order$/))) return fsWorkouts.reorderWorkoutExercises(m[1], body.order, uid)
  }
  if (method === 'DELETE') {
    if ((m = path.match(/^\/routines\/([^/]+)$/))) return fsRoutines.deleteRoutine(m[1], uid)
    if ((m = path.match(/^\/routines\/([^/]+)\/exercises\/([^/]+)$/))) return fsRoutines.deleteRoutineExercise(m[1], m[2], uid)
    if ((m = path.match(/^\/workouts\/([^/]+)$/))) return fsWorkouts.deleteWorkout(m[1], uid)
    if ((m = path.match(/^\/workouts\/([^/]+)\/exercises\/([^/]+)\/sets\/([^/]+)$/))) return fsWorkouts.deleteSet(m[1], m[2], m[3], uid)
    if ((m = path.match(/^\/workouts\/([^/]+)\/exercises\/([^/]+)$/))) return fsWorkouts.deleteWorkoutExercise(m[1], m[2], uid)
  }
  return null
}

function scopedPath(path, uid) {
  return uid ? `${path}?uid=${encodeURIComponent(uid)}` : path;
}

export function createPlanApi(uid) {
return {
  async get(path) {
    if (matches(path, LOCAL_GET)) {
      if (isLocalMode()) return localFetch('GET', scopedPath(path, uid))
      const result = firestoreDispatch('GET', path, undefined, uid)
      if (result) return result
    }

    if (path.startsWith('/exercises')) {
      const params = new URLSearchParams(path.split('?')[1] || '')
      const q = params.get('q') || ''
      const limit = Number(params.get('limit')) || 12
      // Static Yuhonas remains usable when the curated cloud catalog is offline.
      let curated = [];
      if (q.trim()) {
        let timeout;
        try {
          const result = await Promise.race([dbSearch(q, limit), new Promise((resolve) => { timeout = setTimeout(() => resolve(null), 800); })]);
          curated = result?.results || [];
        } catch {} finally { clearTimeout(timeout); }
      }
      const results = filterCatalog(mergeCatalog(curated), { q }).slice(0, limit);
      return { results }
    }

    if (path === '/settings') {
      const settings = normalizeSettings(JSON.parse(localStorage.getItem('wf-settings') || '{}'))
      localStorage.setItem('wf-settings', JSON.stringify(settings))
      return { settings }
    }

    throw new Error(`Nicht unterstützte Plan-Anfrage: ${path}`)
  },

  async post(path, body) {
    if (matches(path, LOCAL_POST)) {
      if (isLocalMode()) return localFetch('POST', scopedPath(path, uid), body)
      const result = firestoreDispatch('POST', path, body, uid)
      if (result) return result
    }

    if (path === '/settings') {
      const cur = normalizeSettings(JSON.parse(localStorage.getItem('wf-settings') || '{}'))
      localStorage.setItem('wf-settings', JSON.stringify(normalizeSettings({ ...cur, ...body })))
      return { ok: true }
    }

    throw new Error(`Nicht unterstützte Plan-Anfrage: ${path}`)
  },

  async patch(path, body) {
    if (matches(path, LOCAL_PATCH)) {
      if (isLocalMode()) return localFetch('PATCH', scopedPath(path, uid), body)
      const result = firestoreDispatch('PATCH', path, body, uid)
      if (result) return result
    }
    throw new Error(`Nicht unterstützte Plan-Anfrage: ${path}`)
  },

  async put(path, body) {
    if (matches(path, LOCAL_PUT)) {
      if (isLocalMode()) return localFetch('PUT', scopedPath(path, uid), body)
      const result = firestoreDispatch('PUT', path, body, uid)
      if (result) return result
    }
    throw new Error(`Nicht unterstützte Plan-Anfrage: ${path}`)
  },

  async delete(path) {
    if (matches(path, LOCAL_DELETE)) {
      if (isLocalMode()) return localFetch('DELETE', scopedPath(path, uid))
      const result = firestoreDispatch('DELETE', path, undefined, uid)
      if (result) return result
    }
    throw new Error(`Nicht unterstützte Plan-Anfrage: ${path}`)
  },

};
}

export const api = createPlanApi();
