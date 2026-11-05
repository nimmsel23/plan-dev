// Drill 2 — Plan → Session-Tab („Quick-Logging mit Vorbereitung“).
// Wandelt eine Plan-Einheit (optional phasen-angepasst) in einen Entwurf für den Session-Editor
// (`initialDraft` = {block, exercises:[{id,name,setsArray,note,...}]}). Die Vorgaben landen als Hinweistext;
// Ist-Werte (reps/weight) bleiben leer – nichts gilt als absolviert, bevor es bestätigt wurde.
import { applyPhaseToRoutine } from './microcycles.js';
import { prescriptionGroups, repetitionLabel, pauseLabel } from './planDocument.js';

export function prescriptionText(ex) {
  const groups = prescriptionGroups(ex).filter((g) => g.count || g.reps || g.duration);
  const parts = groups.map((g) => {
    const rep = repetitionLabel(g);
    const w = g.weight != null && g.weight !== '' ? ` @ ${g.weight} kg` : '';
    if (rep == null || rep === '') return g.count ? `${g.count} Sätze${w}` : '';
    return `${g.count ? `${g.count}×` : ''}${rep}${w}`.trim();
  }).filter(Boolean);
  const bits = [];
  if (parts.length) bits.push(parts.join(' + '));
  if (ex.rir !== null && ex.rir !== undefined && ex.rir !== '') bits.push(`RIR ${ex.rir}`);
  const rest = pauseLabel(ex);
  if (rest !== 'offen') bits.push(`Pause ${rest}`);
  return bits.join(' · ');
}

export function routineToSessionDraft(routine, { phase = null, planName = '', week = null } = {}) {
  const adjusted = applyPhaseToRoutine(routine, phase, week);
  const tag = phase ? ` [${phase.name}${week ? `, W${week}` : ''}]` : '';
  const exercises = (adjusted.exercises || []).map((ex, i) => {
    const count = Math.max(1, ex.templateSets?.length || Number(ex.target_sets) || 1);
    const target = prescriptionText(ex);
    return {
      id: ex.exercise_id || ex.id || `plan_${i}`,
      name: ex.name || `Übung ${i + 1}`,
      primaryMuscles: ex.primaryMuscles || [],
      secondaryMuscles: ex.secondaryMuscles || [],
      stabilizers: ex.stabilizers || [],
      setsArray: Array.from({ length: count }, () => ({ reps: '', weight: '' })),
      note: [target && `Ziel: ${target}`, ex.notes].filter(Boolean).join('\n'),
      source: 'plan',
      slotId: null,
    };
  });
  return { block: `${routine.label}${tag}${planName ? ` · ${planName}` : ''}`, exercises };
}

// Drill 6: Entwurf in eine schon bestehende Session einfügen. Neue Übungen werden angehängt; kommt eine Übung
// (gleiche id) schon vor, erhält sie die vorbereiteten Sätze zusätzlich und die Zielnotiz wird ergänzt.
// Bereits erfasste Ist-Werte bleiben unangetastet (rein, ohne Mutation).
export function mergeDraftIntoExercises(existing = [], draft = null) {
  const incoming = draft?.exercises || [];
  const out = existing.map((e) => ({ ...e }));
  for (const ex of incoming) {
    const i = out.findIndex((e) => e.id === ex.id);
    if (i === -1) { out.push({ ...ex, setsArray: ex.setsArray.map((x) => ({ ...x })) }); continue; }
    const cur = out[i];
    const note = [cur.note, ex.note && !String(cur.note || '').includes(ex.note) ? ex.note : ''].filter(Boolean).join('\n');
    out[i] = { ...cur, setsArray: [...(cur.setsArray || []), ...ex.setsArray.map((x) => ({ ...x }))], note };
  }
  return out;
}

// Drill 7: „Letztes Mal“ je Übung (nur als Vorschlag in der Notiz – nie als Ist-Wert vorbelegt).
// Karte {name -> {date, setsArray}} aus der Session-Historie (neueste zuerst); `excludeDate` blendet den heutigen Tag aus.
export function lastPerformanceMap(sessions = [], excludeDate = null) {
  const map = {};
  for (const s of sessions) {
    if (!s?.date || s.date === excludeDate) continue;
    for (const ex of s.exercises || []) {
      if (ex?.name && !map[ex.name] && (ex.setsArray || []).some((x) => x.reps || x.weight)) map[ex.name] = { date: s.date, setsArray: ex.setsArray };
    }
  }
  return map;
}

export function lastPerformanceText(prev) {
  const sets = (prev?.setsArray || []).filter((x) => x.reps || x.weight);
  if (!sets.length) return '';
  const body = sets.slice(0, 6).map((x) => `${x.reps || '?'}${x.weight ? `×${x.weight}` : ''}`).join(' · ');
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(prev.date || '');
  return `Letztes Mal${d ? ` (${d[3]}.${d[2]}.)` : ''}: ${body}${sets.length > 6 ? ' …' : ''}`;
}

export function withLastPerformance(draft, prevMap = {}) {
  if (!draft?.exercises) return draft;
  return { ...draft, exercises: draft.exercises.map((ex) => {
    const text = lastPerformanceText(prevMap[ex.name]);
    return text ? { ...ex, note: [ex.note, text].filter(Boolean).join('\n') } : ex;
  }) };
}

// Drill 8: „Wie letztes Mal“ per Tipp übernehmen. Füllt NUR leere Felder (nach Index, darüber hinaus der letzte
// Vorwert); bereits eingegebene Werte bleiben. Liefert null, wenn es nichts zu übernehmen gibt.
export function adoptLastSets(current = [], prevSets = []) {
  const prev = (prevSets || []).filter((x) => x && (x.reps || x.weight));
  if (!prev.length || !current.length) return null;
  let changed = false;
  const next = current.map((s, i) => {
    const p = prev[Math.min(i, prev.length - 1)];
    const reps = s.reps === '' || s.reps == null ? (p.reps || '') : s.reps;
    const weight = s.weight === '' || s.weight == null ? (p.weight || '') : s.weight;
    if (reps !== (s.reps ?? '') || weight !== (s.weight ?? '')) changed = true;
    return { ...s, reps, weight };
  });
  return changed ? next : null;
}
