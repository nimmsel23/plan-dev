import { completionsOf, localDay } from './planProgress.js';
import { WEEKDAY_LABELS, weekdayIndex } from './weekSchedule.js';

// „Meine Woche“: pro Wochentag (Mo–So, lokale Zeit) die geplanten Einheiten des Coach-Plans
// mit Status. Gezählt wird nach derselben Erledigt-Regel wie überall (planProgress).
// status: done | open (heute, noch offen) | missed (vergangen, nicht erledigt) | upcoming
export function weekOverview(plan, workouts = [], now = new Date()) {
  const routines = plan?.routines || [];
  const today = weekdayIndex(now);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - today);
  const days = WEEKDAY_LABELS.map((label, day) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + day);
    const key = localDay(date);
    const entries = routines.filter((r) => r.weekdays?.includes(day)).map((routine) => {
      const done = completionsOf(routine, workouts).some((w) => localDay(w.finished_at) === key);
      const status = done ? 'done' : day === today ? 'open' : day < today ? 'missed' : 'upcoming';
      return { routine, status };
    });
    return { day, label, key, isToday: day === today, entries };
  });
  const all = days.flatMap((d) => d.entries);
  return {
    days,
    planned: all.length,
    done: all.filter((e) => e.status === 'done').length,
    missed: all.filter((e) => e.status === 'missed').length,
  };
}
