// Drill 5 — Coach-Auswertung je Mikrozyklus: geplante vs. absolvierte Einheiten, Ø Anstrengung.
// Zuordnung eines Workouts über `sourcePlanMicrocycle.id` (beim Start gesetzt, Drill 1); Workouts ohne Mikrozyklus-Bezug
// (Altbestand, freies Training) zählen nirgends mit – nichts wird geraten.
import { microcycleTimeline } from './microcycles.js';

export function plannedPerWeek(routines = []) {
  return routines.reduce((n, r) => {
    if (r.weekdays?.length) return n + r.weekdays.length;
    if (r.targetCount > 0 && r.targetPeriodDays > 0) return n + (r.targetCount * 7) / r.targetPeriodDays;
    return n;
  }, 0);
}

export function microcycleProgress(plan, workouts = [], now = new Date()) {
  const perWeek = plannedPerWeek(plan?.routines);
  const start = new Date(plan?.publishedAt || plan?.createdAt || now).getTime();
  const week = Number.isFinite(start) ? Math.max(1, Math.floor((now.getTime() - start) / (7 * 86400000)) + 1) : 1;
  const mine = workouts.filter((w) => w.sourcePlanId === plan?.id && w.finished_at);
  return microcycleTimeline(plan?.microcycles).map((p) => {
    const done = mine.filter((w) => (w.sourcePlanMicrocycle ?? w.sourcePlanPhase)?.id === p.id);
    const efforts = done.map((w) => Number(w.feedback?.effort)).filter((e) => Number.isFinite(e) && e > 0);
    const state = week > p.endWeek ? 'past' : week >= p.startWeek ? 'current' : 'upcoming';
    const elapsedWeeks = state === 'past' ? p.weeks : state === 'current' ? week - p.startWeek + 1 : 0;
    return {
      id: p.id, name: p.name, kind: p.kind, startWeek: p.startWeek, endWeek: p.endWeek, state,
      planned: Math.round(perWeek * p.weeks * 10) / 10,
      dueSoFar: Math.round(perWeek * elapsedWeeks * 10) / 10,
      done: done.length,
      avgEffort: efforts.length ? Math.round((efforts.reduce((a, b) => a + b, 0) / efforts.length) * 10) / 10 : null,
    };
  });
}
