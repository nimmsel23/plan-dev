// Was ein Workout „ist“ (Plan-Einheit, Vorlage, Zuweisung) – zum Erkennen eines Startkonflikts.
export function targetKey(x) {
  return x?.sourcePlanRoutineId || x?.routine_id || x?.sourceRoutineId || x?.sourceAssignmentId || null;
}

// Startwunsch `body` gegen ein bereits laufendes Workout: nur wenn beide frei sind oder dasselbe
// Ziel meinen, darf still fortgesetzt werden; sonst muss der Nutzer entscheiden.
export function conflictsWithActive(workout, body = {}) {
  const want = targetKey(body) || (body.routine_snapshot ? `snapshot:${body.name || ''}` : null);
  const have = targetKey(workout);
  if (!want && !have) return false;
  return want !== have;
}

export function findUnfinishedWorkout(workouts = []) {
  return (workouts || []).find((workout) => workout && !workout.finished_at) || null;
}

// Server-/Listenstand vor dem Anlegen: höchstens ein offenes Workout.
// create = loslegen, resume = gleiches Ziel fortsetzen, conflict = Nutzer fragen.
export function resolveStart(workouts, body = {}) {
  const unfinished = findUnfinishedWorkout(workouts);
  if (!unfinished) return { action: 'create' };
  if (conflictsWithActive(unfinished, body)) return { action: 'conflict', workout: unfinished };
  return { action: 'resume', workout: unfinished };
}

export class ActiveWorkoutError extends Error {
  constructor(active) {
    super('Es läuft bereits ein anderes Workout.');
    this.code = 'ACTIVE_WORKOUT';
    this.active = active;
  }
}

export class WorkoutConflictError extends Error {
  constructor(message = 'Dieses Workout wurde auf einem anderen Gerät geändert.') {
    super(message);
    this.code = 'WORKOUT_CONFLICT';
  }
}
