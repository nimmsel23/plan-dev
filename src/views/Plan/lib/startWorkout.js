import { getUid } from '@db';
import { createPlanApi } from '../api.js';
import { ActiveWorkoutError, conflictsWithActive } from './startTarget.js';
import { readActiveWorkout, writeActiveWorkout } from './activeWorkout.js';

const starting = new Map();
// All entry points share one lock and resume the same unfinished workout; a different target
// raises ActiveWorkoutError (code ACTIVE_WORKOUT) so the caller can ask instead of switching silently.
export function startWorkout(body = {}) {
  const uid = getUid();
  const api = createPlanApi(uid);
  if (starting.has(uid)) return starting.get(uid);
  const promise = (async () => {
    const active = readActiveWorkout(uid);
    if (active?.id) {
      // Network errors must not silently discard the pointer and start a duplicate.
      try {
        const { workout } = await api.get(`/workouts/${active.id}`);
        if (workout && !workout.finished_at) {
          if (conflictsWithActive(workout, body)) throw new ActiveWorkoutError({ id: active.id, name: workout.name || active.name || 'Workout' });
          return active.id;
        }
      } catch (error) {
        if (error.code === 'ACTIVE_WORKOUT' || (error.status !== 404 && error.code !== 'not-found')) throw error;
      }
      writeActiveWorkout(null, uid);
    }
    const created = await api.post('/workouts', body);
    if (!created?.id) throw new Error('Workout konnte nicht gestartet werden.');
    writeActiveWorkout({ id: created.id, name: body.name || 'Workout', started_at: new Date().toISOString() }, uid);
    return created.id;
  })().finally(() => { starting.delete(uid); });
  starting.set(uid, promise);
  return promise;
}
