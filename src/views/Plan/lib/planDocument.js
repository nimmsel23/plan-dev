// Display prescriptions as provided; never manufacture sets for incomplete imports.
export function prescriptionGroups(ex) {
  const sets = Array.isArray(ex.templateSets) ? ex.templateSets : [];
  if (ex.prescriptionIncomplete || !sets.length) {
    return [{ count: ex.prescriptionIncomplete ? null : (Number(ex.target_sets) || null), reps: ex.target_reps || null, weight: ex.target_weight ?? null, duration: ex.targetDuration ?? null, type: 'normal' }];
  }
  return sets.reduce((groups, set) => {
    const next = { reps: set.targetReps ?? null, weight: set.targetWeight ?? null, duration: set.targetDuration ?? null, type: set.setType || 'normal' };
    const last = groups.at(-1);
    if (last && ['reps', 'weight', 'duration', 'type'].every((key) => last[key] === next[key])) last.count++;
    else groups.push({ ...next, count: 1 });
    return groups;
  }, []);
}
export function pauseLabel(ex) {
  return ex.restLabel || (ex.rest_seconds === '' || ex.rest_seconds == null ? 'offen' : `${ex.rest_seconds} s`);
}
export function frequencyLabel(routines) {
  return routines.length && routines.every((r) => r.targetPeriodDays === 7 && r.targetCount > 0)
    ? `${routines.reduce((n, r) => n + r.targetCount, 0)} Einheiten / Woche`
    : `${routines.length} Trainingstage`;
}

export function repetitionLabel(group) {
  if (group.duration != null) return `${group.duration} s`;
  return typeof group.reps === 'string' && /muskelversagen|bis zum versagen/i.test(group.reps) ? 'bis Versagen' : group.reps;
}
