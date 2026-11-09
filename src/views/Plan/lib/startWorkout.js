import { getUid } from '@db';
import { createPlanApi } from '../api.js';
import { ActiveWorkoutError, resolveStart } from './startTarget.js';
import { readActiveWorkout, writeActiveWorkout } from './activeWorkout.js';

const starting = new Map();

function activeFrom(workout) {
  return { id: workout.id, name: workout.name || 'Workout' };
}

function remember(workout, uid) {
  writeActiveWorkout({
    id: workout.id,
    name: workout.name || 'Workout',
    started_at: workout.started_at || new Date().toISOString(),
  }, uid);
  return workout.id;
}

// All entry points share one lock and resume the same unfinished workout; a different target
// raises ActiveWorkoutError (code ACTIVE_WORKOUT) so the caller can ask instead of switching silently.
// Server unfinished workouts win over a missing local pointer (multi-device / cleared storage).
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
          const decision = resolveStart([workout], body);
          if (decision.action === 'conflict') throw new ActiveWorkoutError(activeFrom(workout));
          return remember(workout, uid);
        }
      } catch (error) {
        if (error.code === 'ACTIVE_WORKOUT' || (error.status !== 404 && error.code !== 'not-found')) throw error;
      }
      writeActiveWorkout(null, uid);
    }

    const { workouts } = await api.get('/workouts');
    const decision = resolveStart(workouts, body);
    if (decision.action === 'conflict') throw new ActiveWorkoutError(activeFrom(decision.workout));
    if (decision.action === 'resume') return remember(decision.workout, uid);

    try {
      const created = await api.post('/workouts', body);
      if (!created?.id) throw new Error('Workout konnte nicht gestartet werden.');
      return remember({ id: created.id, name: body.name || 'Workout', started_at: new Date().toISOString() }, uid);
    } catch (error) {
      if (error.code === 'ACTIVE_WORKOUT' && error.active?.id) {
        throw new ActiveWorkoutError(activeFrom(error.active));
      }
      throw error;
    }
  })().finally(() => { starting.delete(uid); });
  starting.set(uid, promise);
  return promise;
}
