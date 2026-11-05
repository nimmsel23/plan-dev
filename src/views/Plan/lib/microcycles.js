// Drill 1 — Periodisierung: Mikrozyklen innerhalb eines Makrozyklus.
// Ein Plan (`macrocycle`) hat optional `microcycles`: aufeinanderfolgende Blöcke mit Wochenzahl, Art,
// Volumen-Faktor und RIR-Verschiebung. Ohne Mikrozyklen verhält sich alles wie bisher (Rückwärtskompatibilität).
// normalizeMicrocycles wird von beiden Backends gespiegelt (macrocycles.py::_microcycles) – Änderungen immer dort mitziehen.

export const MICROCYCLE_KINDS = {
  base: { label: 'Basis', volumePct: 100, rirDelta: 0 },
  build: { label: 'Aufbau', volumePct: 110, rirDelta: -1 },
  peak: { label: 'Peak', volumePct: 90, rirDelta: -2 },
  deload: { label: 'Deload', volumePct: 60, rirDelta: 2 },
  test: { label: 'Test', volumePct: 70, rirDelta: 0 },
};
export const MAX_PLAN_WEEKS = 104;

const clampInt = (v, lo, hi, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

export function newMicrocycle(kind = 'base', weeks = 1) {
  const k = MICROCYCLE_KINDS[kind] ? kind : 'base';
  return { id: `ph-${Math.random().toString(36).slice(2, 8)}`, name: MICROCYCLE_KINDS[k].label, kind: k, weeks, volumePct: MICROCYCLE_KINDS[k].volumePct, rirDelta: MICROCYCLE_KINDS[k].rirDelta, weeklyWeightPct: 0, note: '' };
}

// Gültige, begrenzte Mikrozyklenliste; ungültige Einträge fallen weg, Summe wird auf MAX_PLAN_WEEKS gekappt.
export function normalizeMicrocycles(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  let total = 0;
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const kind = MICROCYCLE_KINDS[raw.kind] ? raw.kind : 'base';
    let id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 40) : `ph-${out.length + 1}`;
    while (seen.has(id)) id = `${id}-x`;
    seen.add(id);
    const weeks = Math.min(clampInt(raw.weeks, 1, 52, 1), MAX_PLAN_WEEKS - total);
    if (weeks < 1) break;
    total += weeks;
    out.push({
      id,
      name: (typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : MICROCYCLE_KINDS[kind].label).slice(0, 60),
      kind,
      weeks,
      volumePct: clampInt(raw.volumePct, 30, 150, MICROCYCLE_KINDS[kind].volumePct),
      rirDelta: clampInt(raw.rirDelta, -3, 3, MICROCYCLE_KINDS[kind].rirDelta),
      weeklyWeightPct: clampInt(raw.weeklyWeightPct, 0, 10, 0),
      note: (typeof raw.note === 'string' ? raw.note.trim() : '').slice(0, 300),
    });
  }
  return out;
}

export const microcyclesTotalWeeks = (microcycles) => normalizeMicrocycles(microcycles).reduce((n, p) => n + p.weeks, 0);

// Zeitleiste mit Start-/Endwoche (1-basiert, inklusive).
export function microcycleTimeline(microcycles) {
  let start = 1;
  return normalizeMicrocycles(microcycles).map((p) => { const row = { ...p, startWeek: start, endWeek: start + p.weeks - 1 }; start += p.weeks; return row; });
}

// Mikrozyklus einer Plan-Woche (1-basiert). Nach dem Ende gilt die letzte Mikrozyklus; ohne Mikrozyklen null.
export function microcycleForWeek(microcycles, week) {
  const tl = microcycleTimeline(microcycles);
  if (!tl.length) return null;
  const w = Math.max(1, Math.floor(Number(week)) || 1);
  return tl.find((p) => w >= p.startWeek && w <= p.endWeek) || tl.at(-1);
}

export const isDeloadWeek = (microcycles, week) => microcycleForWeek(microcycles, week)?.kind === 'deload';

// Wendet Volumen-Faktor und RIR-Verschiebung auf einen Übungs-Snapshot an (rein, ohne Mutation).
// Sätze werden gekürzt bzw. um Kopien des letzten Satzes ergänzt; fehlende Zielwerte werden nie erfunden.
// Gewichtsprogression: +weeklyWeightPct % je Woche innerhalb der Mikrozyklus (ab Woche 2), gerundet auf 0,5 kg.
export function progressedWeight(weight, microcycle, week) {
  const w = Number(weight);
  if (weight === null || weight === undefined || weight === '' || !Number.isFinite(w) || !microcycle?.weeklyWeightPct) return weight;
  const into = Math.max(0, (Math.floor(Number(week)) || microcycle.startWeek || 1) - (microcycle.startWeek || 1));
  return Math.round((w * (1 + microcycle.weeklyWeightPct / 100) ** into) * 2) / 2;
}

export function applyMicrocycleToExercise(ex, microcycle, week) {
  if (!microcycle || !ex) return ex;
  const factor = (microcycle.volumePct ?? 100) / 100;
  const out = { ...ex };
  if (Array.isArray(ex.templateSets) && ex.templateSets.length) {
    const target = Math.max(1, Math.round(ex.templateSets.length * factor));
    const sets = ex.templateSets.slice(0, target).map((s) => ({ ...s }));
    while (sets.length < target) sets.push({ ...ex.templateSets.at(-1) });
    out.templateSets = sets.map((s, i) => ({ ...s, setIndex: i, ...(s.targetWeight != null && s.targetWeight !== '' ? { targetWeight: progressedWeight(s.targetWeight, microcycle, week) } : {}) }));
    out.target_sets = out.templateSets.length;
  } else if (Number(ex.target_sets) > 0) {
    out.target_sets = Math.max(1, Math.round(Number(ex.target_sets) * factor));
  }
  if (ex.target_weight != null && ex.target_weight !== '') out.target_weight = progressedWeight(ex.target_weight, microcycle, week);
  // RIR (Reps in Reserve) liegt je Übung in `rir`; null/leer bleibt leer.
  if (ex.rir !== null && ex.rir !== undefined && ex.rir !== '' && Number.isFinite(Number(ex.rir))) out.rir = Math.min(5, Math.max(0, Number(ex.rir) + (microcycle.rirDelta || 0)));
  return out;
}

export function applyMicrocycleToRoutine(routine, microcycle, week) {
  if (!microcycle || !routine) return routine;
  return { ...routine, exercises: (routine.exercises || []).map((e) => applyMicrocycleToExercise(e, microcycle, week)) };
}

// Kurztext für Karten: „Woche 3/10 · Aufbau (110 % Volumen, RIR −1)“.
export function microcycleSummary(microcycles, week) {
  const p = microcycleForWeek(microcycles, week);
  if (!p) return '';
  const total = microcyclesTotalWeeks(microcycles);
  const rir = p.rirDelta ? `, RIR ${p.rirDelta > 0 ? '+' : '−'}${Math.abs(p.rirDelta)}` : '';
  return `Woche ${Math.min(Math.max(1, week), total)}/${total} · ${p.name} (${p.volumePct} % Volumen${rir})`;
}

// Aktuelle Plan-Woche (1-basiert) ab Veröffentlichung bzw. Anlage; spiegelt die Server-Regel `currentWeek`.
export function planWeek(plan, now = new Date()) {
  const start = new Date(plan?.publishedAt || plan?.createdAt || now).getTime();
  if (!Number.isFinite(start)) return 1;
  return Math.max(1, Math.floor((now.getTime() - start) / (7 * 86400000)) + 1);
}

// Altdaten: bis 2026-11-05 hieß das Feld `phases`. Liest ein Dokument (Plan, Version, Snapshot) und liefert es mit `microcycles`.
export function withMicrocycles(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const { phases, ...rest } = doc;
  const out = phases !== undefined && rest.microcycles === undefined ? { ...rest, microcycles: phases } : rest;
  if (out.published && typeof out.published === 'object') out.published = withMicrocycles(out.published);
  if (out.snapshot && typeof out.snapshot === 'object') out.snapshot = withMicrocycles(out.snapshot);
  return out;
}
