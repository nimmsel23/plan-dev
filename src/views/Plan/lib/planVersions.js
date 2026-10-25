// Git-artige Versionen für Coach-Pläne: Der Plan selbst ist der Arbeitsstand,
// jede Veröffentlichung ist ein unveränderlicher Commit (`versions/vN`) mit Nachricht.
// snapshotOf bleibt bewusst nah an den Backends (Python vergleicht dict-Gleichheit: weekdays sortiert,
// exercises default []); nur fehlende Ziel-Zahlen (Legacy) zählen als 0.
// Klienten sehen immer den Stand des letzten Commits (`plan.published`), nie den Arbeitsstand.

export function snapshotOf(plan = {}) {
  return {
    name: plan.name || '',
    description: plan.description || '',
    totalWeeks: Number(plan.totalWeeks) || 10,
    routines: (plan.routines || []).map((r) => ({ ...r, targetCount: Number(r.targetCount) || 0, targetPeriodDays: Number(r.targetPeriodDays) || 0, weekdays: [...(r.weekdays || [])].sort((a, b) => a - b), exercises: r.exercises || [] })),
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
const eq = (x, y) => stable({ v: x }) === stable({ v: y });
const days = (w) => (Array.isArray(w) ? [...new Set(w.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((x, y) => x - y) : []);
const dayText = (w) => days(w).map((d) => DAYS[d]).join(', ') || '–';
const show = (v) => (v === undefined || v === null || v === '' ? '–' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const ROUTINE_SKIP = new Set(['id', 'label', 'exercises', 'weekdays', 'sourceTemplateId', 'targetCount', 'targetPeriodDays']);
const ROUTINE_LABEL = { isDeload: 'Deload', restHoursAfter: 'Pause danach (h)' };
const EX_SKIP = new Set(['name', 'templateSets', 'exercise_id', 'id']);
const EX_LABEL = { notes: 'Hinweis', rest_seconds: 'Pause', instructions: 'Anleitung', target_sets: 'Sätze', target_reps: 'Wdh.', target_weight: 'Gewicht' };
const SET_LABEL = { targetReps: 'Wdh.', targetWeight: 'kg', targetDistance: 'km', targetDuration: 's', setType: 'Typ', progressionStage: 'Stufe' };
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const keysOf = (a, b) => [...new Set([...Object.keys(isObj(a) ? a : {}), ...Object.keys(isObj(b) ? b : {})])];
const setText = (s) => (isObj(s) ? Object.keys(s).filter((k) => k !== 'setIndex' && s[k] !== null && s[k] !== undefined && s[k] !== '').map((k) => `${show(s[k])}${SET_LABEL[k] ? ` ${SET_LABEL[k]}` : ` (${k})`}`).join(' × ') : show(s)) || '–';

// Elemente mit Schlüssel; Kollisionen (gleiche ID/gleicher Name mehrfach) bekommen den Vorkommens-Index.
function keyed(list, keyFn) {
  const n = new Map();
  return (list || []).map((x) => { const k = String(keyFn(x) ?? ''); const i = n.get(k) || 0; n.set(k, i + 1); return [`${k}#${i}`, x]; });
}
const orderChanged = (aKeys, bKeys) => { const inB = new Set(bKeys); const inA = new Set(aKeys); return aKeys.filter((k) => inB.has(k)).join('\u0000') !== bKeys.filter((k) => inA.has(k)).join('\u0000'); };

function diffExercise(tag, p, e, lines) {
  const parts = [];
  if (p.name !== e.name) parts.push(`Name „${show(p.name)}“ → „${show(e.name)}“`);
  const ps = p.templateSets; const es = e.templateSets;
  const bothSets = Array.isArray(ps) && Array.isArray(es);
  if (bothSets && !eq(ps, es)) {
    const sets = [];
    if (ps.length !== es.length) sets.push(`${ps.length}→${es.length} Sätze`);
    for (let i = 0; i < Math.min(ps.length, es.length); i++) if (!eq(ps[i], es[i])) sets.push(`Satz ${i + 1}: ${setText(ps[i])} → ${setText(es[i])}`);
    parts.push(sets.join('; ') || 'Sätze geändert');
  }
  const fields = keysOf(p, e).filter((k) => !EX_SKIP.has(k) && !eq(p[k], e[k])).map((k) => EX_LABEL[k] || k);
  if (!bothSets && !eq(ps, es)) fields.push('Sätze');
  if (fields.length) parts.push(`${fields.join(', ')} geändert`);
  if (parts.length) lines.push({ kind: 'change', text: `${tag}: ${e.name || p.name || 'Übung'} – ${parts.join('; ')}` });
}

// Lesbare Änderungsliste von `from` nach `to` (beide Snapshots; `from` darf null sein = leer).
// Garantie: sameSnapshot(a, b) === false => mindestens eine Zeile.
export function diffSnapshots(from, to) {
  const a = snapshotOf(from || {});
  const b = snapshotOf(to || {});
  const lines = [];
  if (from && a.name !== b.name) lines.push({ kind: 'change', text: `Name: „${a.name}“ → „${b.name}“` });
  if (a.description !== b.description) lines.push({ kind: 'change', text: 'Coach-Hinweis geändert' });
  if (from && a.totalWeeks !== b.totalWeeks) lines.push({ kind: 'change', text: `Dauer: ${a.totalWeeks} → ${b.totalWeeks} Wochen` });
  const rk = (r) => r.id ?? r.label;
  const aR = keyed(a.routines, rk);
  const bR = keyed(b.routines, rk);
  const old = new Map(aR);
  const cur = new Map(bR);
  if (from && orderChanged(aR.map(([k]) => k), bR.map(([k]) => k))) {
    const inB = new Set(cur.keys()); const inA = new Set(old.keys());
    lines.push({ kind: 'change', text: `Reihenfolge der Einheiten geändert: ${aR.filter(([k]) => inB.has(k)).map(([, r]) => r.label).join(', ')} → ${bR.filter(([k]) => inA.has(k)).map(([, r]) => r.label).join(', ')}` });
  }
  for (const [k, r] of bR) {
    const o = old.get(k);
    const exs = r.exercises || [];
    if (!o) { lines.push({ kind: 'add', text: `Einheit „${r.label}“ hinzugefügt (${exs.length} Übungen)` }); continue; }
    const tag = `„${r.label}“`;
    if (o.label !== r.label) lines.push({ kind: 'change', text: `Einheit „${o.label}“ → „${r.label}“` });
    if (stable(o.weekdays) !== stable(r.weekdays)) lines.push({ kind: 'change', text: `${tag}: Tage ${dayText(o.weekdays)} → ${dayText(r.weekdays)}` });
    if (o.targetCount !== r.targetCount || o.targetPeriodDays !== r.targetPeriodDays) lines.push({ kind: 'change', text: `${tag}: Ziel ${o.targetCount}× in ${o.targetPeriodDays} Tagen → ${r.targetCount}× in ${r.targetPeriodDays} Tagen` });
    for (const f of keysOf(o, r)) if (!ROUTINE_SKIP.has(f) && !eq(o[f], r[f])) lines.push({ kind: 'change', text: `${tag}: ${ROUTINE_LABEL[f] || f} ${show(o[f])} → ${show(r[f])}` });
    const ek = (e) => e.exercise_id || e.id || e.name;
    const aE = keyed(o.exercises, ek); const bE = keyed(exs, ek);
    const oldEx = new Map(aE); const curEx = new Map(bE);
    for (const [ key, e] of bE) {
      const p = oldEx.get(key);
      if (!p) lines.push({ kind: 'add', text: `${tag}: + ${e.name}` });
      else diffExercise(tag, p, e, lines);
    }
    for (const [key, e] of aE) if (!curEx.has(key)) lines.push({ kind: 'remove', text: `${tag}: − ${e.name}` });
    if (orderChanged(aE.map(([x]) => x), bE.map(([x]) => x))) lines.push({ kind: 'change', text: `${tag}: Reihenfolge der Übungen geändert` });
  }
  for (const [k, r] of aR) if (!cur.has(k)) lines.push({ kind: 'remove', text: `Einheit „${r.label}“ entfernt` });
  if (!lines.length && !sameSnapshot(a, b)) lines.push({ kind: 'change', text: 'Interne Daten geändert (z. B. Vorlagen-Verknüpfung)' });
  return lines;
}
