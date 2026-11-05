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
  const adjusted = applyPhaseToRoutine(routine, phase);
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
