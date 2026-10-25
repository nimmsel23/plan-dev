// Eine Regel für „Einheit erledigt“ — gemeinsam für Wochenplan („heute offen“), Zeitraumziele
// und die Reihenfolge-Empfehlung. Tage zählen in lokaler Zeit (nicht UTC).
const pad = (n) => String(n).padStart(2, '0');

export function localDay(value) {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const isFinished = (w) => !!w?.finished_at && w.sessionState !== 'work';

// Primär über die Plan-Einheit (sourcePlanRoutineId), sonst über die Herkunfts-Vorlage.
export function matchesPlanRoutine(routine, w) {
  if (w.sourcePlanRoutineId) return w.sourcePlanRoutineId === routine.id;
  return !!routine.sourceTemplateId && w.routine_id === routine.sourceTemplateId;
}

export function completionsOf(routine, workouts = []) {
  return workouts.filter((w) => isFinished(w) && matchesPlanRoutine(routine, w));
}

export function completionsInWindow(routine, workouts, periodDays, now = new Date()) {
  if (!periodDays) return 0;
  const cutoff = now.getTime() - periodDays * 86400000;
  return completionsOf(routine, workouts).filter((w) => Date.parse(w.finished_at) >= cutoff).length;
}

export function lastCompletedAt(routine, workouts) {
  return completionsOf(routine, workouts).reduce((max, w) => (w.finished_at > max ? w.finished_at : max), '');
}

export function doneOnDay(routine, workouts, day = new Date()) {
  const key = localDay(day);
  return completionsOf(routine, workouts).some((w) => localDay(w.finished_at) === key);
}
