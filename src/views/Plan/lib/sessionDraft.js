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
    return `${g.count ? `${g.count}×` : ''}${rep ?? ''}${w}`.trim();
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
