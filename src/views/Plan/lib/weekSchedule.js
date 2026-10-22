// Wochenplan: Plan-Einheiten tragen optional `weekdays` (0 = Montag … 6 = Sonntag).
export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function weekdayIndex(date = new Date()) { return (date.getDay() + 6) % 7; }

export function toggleWeekday(days = [], day) {
  const set = new Set(days);
  if (set.has(day)) set.delete(day); else set.add(day);
  return [...set].sort((a, b) => a - b);
}

export function hasSchedule(routines = []) { return routines.some((r) => r.weekdays?.length); }

// Pro Tag die Einheiten, die dafür geplant sind.
export function weekGrid(routines = []) {
  return WEEKDAY_LABELS.map((label, day) => ({ day, label, routines: routines.filter((r) => r.weekdays?.includes(day)) }));
}

export function routinesForDay(routines = [], day = weekdayIndex()) {
  return routines.filter((r) => r.weekdays?.includes(day));
}

// Heute geplante Einheit, die seit Mitternacht noch nicht abgeschlossen wurde.
export function todaysOpenRoutines(routines, workouts = [], now = new Date()) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return routinesForDay(routines, weekdayIndex(now)).filter((r) =>
    !workouts.some((w) => w.finished_at && Date.parse(w.finished_at) >= midnight
      && (w.sourcePlanRoutineId === r.id || (r.sourceTemplateId && w.routine_id === r.sourceTemplateId))));
}
