import { completionsOf, localDay } from './planProgress.js';
import { weekdayIndex } from './weekSchedule.js';

// Fälligkeitsfenster einer geplanten Einheit (±1 Tag, lokale Kalendertage):
//   Vortag = scheduled (ab jetzt möglich) · Plantag = due · ab dem Folgetag = overdue.
// „Verpasst“ gibt es nicht: Offenes bleibt offen (overdue), bis es gemacht wird.
// Ein Abschluss erfüllt zuerst das Vorkommen in seinem ±1-Tag-Fenster; bleibt er übrig (Zusatztraining),
// erfüllt er das älteste noch offene Vorkommen derselben Einheit (Nachholen).
export const WINDOW_DAYS = 1;
// So weit zurück bleiben offene Vorkommen sichtbar (oder ab `since`, z. B. Veröffentlichung des Plans).
export const BACKLOG_DAYS = 28;

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
  return 'overdue';
}

export const OPEN_STATUSES = ['overdue', 'due', 'scheduled'];
const ORDER = { overdue: 0, due: 1, scheduled: 2 };

// Alle Vorkommen der Plan-Einheiten zwischen from und to (inkl.), mit Zuordnung der Abschlüsse:
// Jeder Abschluss belegt höchstens ein Vorkommen derselben Einheit (das früheste freie, dessen Fenster ihn enthält).
export function occurrences(routines = [], workouts = [], from, to, now = new Date(), { since } = {}) {
  const today = startOfDay(now);
  const floor = since ? startOfDay(new Date(since)) : addDays(today, -BACKLOG_DAYS);
  const first = new Date(Math.min(addDays(startOfDay(from), -2 * WINDOW_DAYS), floor));
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
      else { // Nachholen: ältestes offenes Vorkommen, das vor dem Fenster dieses Abschlusses liegt
        const older = list.find((o) => !o.doneAt && dayDiff(o.date, wd) > WINDOW_DAYS);
        if (older) older.doneAt = w.finished_at;
      }
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
export function openOccurrences(routines, workouts, now = new Date(), { since } = {}) {
  const today = startOfDay(now);
  const floor = since ? startOfDay(new Date(since)) : addDays(today, -BACKLOG_DAYS);
  return occurrences(routines, workouts, floor, addDays(today, WINDOW_DAYS), now, { since })
    .filter((o) => OPEN_STATUSES.includes(o.status))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.date - b.date);
}

// Pro Einheit nur das älteste offene Vorkommen (Backlog-Duplikate derselben Einheit zusammenfassen).
export function openByRoutine(routines, workouts, now, opts) {
  const seen = new Set();
  return openOccurrences(routines, workouts, now, opts).filter((o) => !seen.has(o.routine.id) && seen.add(o.routine.id));
}
