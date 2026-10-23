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

export class ActiveWorkoutError extends Error {
  constructor(active) {
    super('Es läuft bereits ein anderes Workout.');
    this.code = 'ACTIVE_WORKOUT';
    this.active = active;
  }
}
