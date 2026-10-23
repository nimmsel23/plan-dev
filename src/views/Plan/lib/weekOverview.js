import { occurrences } from './occurrences.js';
import { WEEKDAY_LABELS, weekdayIndex } from './weekSchedule.js';
import { localDay } from './planProgress.js';

// „Meine Woche“: pro Wochentag (Mo–So, lokale Zeit) die geplanten Einheiten des Coach-Plans mit Status
// (Fälligkeitsfenster ±1 Tag, siehe occurrences.js).
// status: done | scheduled (ab Vortag möglich) | due (heute fällig) | overdue (gestern fällig) | missed | upcoming
export function weekOverview(plan, workouts = [], now = new Date()) {
  const routines = plan?.routines || [];
  const today = weekdayIndex(now);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - today);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const occ = occurrences(routines, workouts, monday, sunday, now);
  const days = WEEKDAY_LABELS.map((label, day) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + day);
    const key = localDay(date);
    const entries = occ.filter((o) => o.key === key).map((o) => ({ routine: o.routine, status: o.status, doneAt: o.doneAt }));
    return { day, label, key, isToday: day === today, entries };
  });
  const all = days.flatMap((d) => d.entries);
  return {
    days,
    planned: all.length,
    done: all.filter((e) => e.status === 'done').length,
    missed: all.filter((e) => e.status === 'missed').length,
    overdue: all.filter((e) => e.status === 'overdue').length,
  };
}
