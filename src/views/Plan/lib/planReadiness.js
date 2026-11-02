export function completePrescription(exercise, sets = exercise.templateSets) {
  if (!Array.isArray(sets)) return !exercise.prescriptionIncomplete;
  if (!sets.length) return false;
  return sets.every((set) => {
    if (exercise.trackingType === 'duration') return Number(set.targetDuration) > 0;
    if (exercise.trackingType === 'distance_time') return Number(set.targetDistance) > 0 || Number(set.targetDuration) > 0;
    return !!String(set.targetReps ?? '').trim() && String(set.targetReps).trim().toLowerCase() !== 'offen';
  });
}
export function planReleaseIssues(plan) {
  const issues = [];
  if (!plan.routines?.length) issues.push('Mindestens einen Trainingstag mit Übungen anlegen.');
  for (const day of plan.routines || []) {
    if (!day.exercises?.length) issues.push(`${day.label}: mindestens eine Übung ergänzen.`);
    for (const ex of day.exercises || []) {
      if (ex.prescriptionIncomplete || !completePrescription(ex)) issues.push(`${day.label} · ${ex.name}: Satzvorgaben ergänzen.`);
    }
  }
  return issues;
}
