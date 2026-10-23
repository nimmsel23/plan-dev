import { completionsOf, localDay } from './planProgress.js';
import { weekdayIndex } from './weekSchedule.js';

// Fälligkeitsfenster einer geplanten Einheit (±1 Tag, lokale Kalendertage):
//   Vortag = scheduled (ab jetzt möglich) · Plantag = due · Folgetag = overdue · danach = missed.
// Eine Einheit gilt als erledigt, wenn sie im Fenster [Vortag, Folgetag] abgeschlossen wurde.
export const WINDOW_DAYS = 1;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// Tage von a nach b (lokal, DST-sicher).
const dayDiff = (a, b) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);

// offset = heute − Plantag
export function statusFor(offset, done) {
  if (done) return 'done';
  if (offset < -WINDOW_DAYS) return 'upcoming';
  if (offset === -WINDOW_DAYS) return 'scheduled';
  if (offset === 0) return 'due';
  if (offset === WINDOW_DAYS) return 'overdue';
  return 'missed';
}

export const OPEN_STATUSES = ['overdue', 'due', 'scheduled'];
const ORDER = { overdue: 0, due: 1, scheduled: 2 };

// Alle Vorkommen der Plan-Einheiten zwischen from und to (inkl.), mit Zuordnung der Abschlüsse:
// Jeder Abschluss belegt höchstens ein Vorkommen derselben Einheit (das früheste freie, dessen Fenster ihn enthält).
export function occurrences(routines = [], workouts = [], from, to, now = new Date()) {
  const today = startOfDay(now);
  const first = addDays(startOfDay(from), -2 * WINDOW_DAYS);
  const last = addDays(startOfDay(to), 2 * WINDOW_DAYS);
  const out = [];
  for (const routine of routines) {
    if (!routine.weekdays?.length) continue;
    const list = [];
    for (let d = first; d <= last; d = addDays(d, 1)) {
      if (routine.weekdays.includes(weekdayIndex(d))) list.push({ routine, date: d, key: localDay(d), day: weekdayIndex(d), doneAt: null });
    }
    const finished = completionsOf(routine, workouts).slice().sort((a, b) => a.finished_at.localeCompare(b.finished_at));
    for (const w of finished) {
      const wd = startOfDay(new Date(w.finished_at));
      const occ = list.find((o) => !o.doneAt && Math.abs(dayDiff(o.date, wd)) <= WINDOW_DAYS);
      if (occ) occ.doneAt = w.finished_at;
    }
    for (const o of list) {
      if (o.date < startOfDay(from) || o.date > startOfDay(to)) continue;
      const offset = dayDiff(o.date, today);
      out.push({ ...o, offset, status: statusFor(offset, !!o.doneAt) });
    }
  }
  return out.sort((a, b) => a.date - b.date || (a.routine.order ?? 0) - (b.routine.order ?? 0));
}

// Jetzt machbare Einheiten (scheduled/due/overdue), dringendste zuerst.
export function openOccurrences(routines, workouts, now = new Date()) {
  const today = startOfDay(now);
  return occurrences(routines, workouts, addDays(today, -WINDOW_DAYS), addDays(today, WINDOW_DAYS), now)
    .filter((o) => OPEN_STATUSES.includes(o.status))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.date - b.date);
}
