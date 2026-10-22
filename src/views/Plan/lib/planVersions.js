// Git-artige Versionen für Coach-Pläne: Der Plan selbst ist der Arbeitsstand,
// jede Veröffentlichung ist ein unveränderlicher Commit (`versions/vN`) mit Nachricht.
// Klienten sehen immer den Stand des letzten Commits (`plan.published`), nie den Arbeitsstand.

export function snapshotOf(plan = {}) {
  return {
    name: plan.name || '',
    description: plan.description || '',
    totalWeeks: Number(plan.totalWeeks) || 10,
    routines: (plan.routines || []).map((r) => ({ ...r, weekdays: [...(r.weekdays || [])].sort((a, b) => a - b), exercises: r.exercises || [] })),
  };
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter((k) => value[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value ?? null);
}

export function sameSnapshot(a, b) { return stable(a) === stable(b); }

// Ansicht des Klienten: veröffentlichter Stand über den Arbeitsstand gelegt.
export function clientView(plan) {
  if (!plan?.published) return plan;
  return { ...plan, ...plan.published };
}

export function hasUnpublishedChanges(plan) {
  return !!plan?.published && !sameSnapshot(snapshotOf(plan), snapshotOf(plan.published));
}

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const setsOf = (ex) => ex.templateSets || [];
const setText = (s) => [s.targetReps && `${s.targetReps} Wdh.`, s.targetWeight != null && s.targetWeight !== '' && `${s.targetWeight} kg`].filter(Boolean).join(' × ');

// Lesbare Änderungsliste von `from` nach `to` (beide Snapshots; `from` darf null sein = leer).
export function diffSnapshots(from, to) {
  const a = snapshotOf(from || {});
  const b = snapshotOf(to || {});
  const lines = [];
  if (from && a.name !== b.name) lines.push({ kind: 'change', text: `Name: „${a.name}“ → „${b.name}“` });
  if (a.description !== b.description) lines.push({ kind: 'change', text: 'Coach-Hinweis geändert' });
  if (from && a.totalWeeks !== b.totalWeeks) lines.push({ kind: 'change', text: `Dauer: ${a.totalWeeks} → ${b.totalWeeks} Wochen` });
  const old = new Map(a.routines.map((r) => [r.id, r]));
  const seen = new Set();
  for (const r of b.routines) {
    const o = old.get(r.id);
    if (!o) { lines.push({ kind: 'add', text: `Einheit „${r.label}“ hinzugefügt (${r.exercises.length} Übungen)` }); continue; }
    seen.add(r.id);
    const tag = `„${r.label}“`;
    if (o.label !== r.label) lines.push({ kind: 'change', text: `Einheit „${o.label}“ → „${r.label}“` });
    if (stable(o.weekdays) !== stable(r.weekdays)) lines.push({ kind: 'change', text: `${tag}: Tage ${o.weekdays.map((d) => DAYS[d]).join(', ') || '–'} → ${r.weekdays.map((d) => DAYS[d]).join(', ') || '–'}` });
    if (o.targetCount !== r.targetCount || o.targetPeriodDays !== r.targetPeriodDays) lines.push({ kind: 'change', text: `${tag}: Ziel ${o.targetCount || 0}× in ${o.targetPeriodDays || 0} Tagen → ${r.targetCount || 0}× in ${r.targetPeriodDays || 0} Tagen` });
    const oldEx = new Map(o.exercises.map((e) => [e.exercise_id || e.id || e.name, e]));
    const keys = new Set();
    for (const e of r.exercises) {
      const k = e.exercise_id || e.id || e.name; keys.add(k);
      const p = oldEx.get(k);
      if (!p) { lines.push({ kind: 'add', text: `${tag}: + ${e.name}` }); continue; }
      const before = setsOf(p).map(setText).join(' | ');
      const after = setsOf(e).map(setText).join(' | ');
      if (setsOf(p).length !== setsOf(e).length || before !== after) lines.push({ kind: 'change', text: `${tag}: ${e.name} ${setsOf(p).length}→${setsOf(e).length} Sätze${before !== after ? ` (${after || '–'})` : ''}` });
      else if ((p.notes || '') !== (e.notes || '') || (p.rest_seconds ?? null) !== (e.rest_seconds ?? null)) lines.push({ kind: 'change', text: `${tag}: ${e.name} Hinweis/Pause geändert` });
    }
    for (const [k, e] of oldEx) if (!keys.has(k)) lines.push({ kind: 'remove', text: `${tag}: − ${e.name}` });
    const order = (x) => x.exercises.map((e) => e.exercise_id || e.id || e.name).filter((k) => oldEx.has(k) && keys.has(k)).join();
    if (order(o) !== order(r) && !lines.some((l) => l.text.startsWith(tag) && l.kind !== 'change')) lines.push({ kind: 'change', text: `${tag}: Reihenfolge geändert` });
  }
  for (const [id, r] of old) if (!seen.has(id) && !b.routines.some((x) => x.id === id)) lines.push({ kind: 'remove', text: `Einheit „${r.label}“ entfernt` });
  return lines;
}
