// Template-Sets-Normalisierung für RoutineBuilder.jsx: eine Übung im
// Editor kann entweder schon `templateSets` haben (neues Format) oder nur
// die Legacy-Felder (target_sets/target_reps/...) — ensureTemplateSets()
// migriert bei Bedarf on-the-fly, patchTemplateSets() hält beide Formate
// synchron beim Editieren (Legacy-Felder bleiben für Alt-Konsumenten
// gültig, siehe _derive_legacy_routine_fields in workouts.py).
export function ensureTemplateSets(ex) {
  if (ex.prescriptionIncomplete) return Array.isArray(ex.templateSets) ? ex.templateSets : [];
  if (Array.isArray(ex.templateSets) && ex.templateSets.length > 0) return ex.templateSets;
  return Array.from({ length: Math.max(1, Number(ex.target_sets) || 3) }, (_, index) => ({
    setIndex: index + 1,
    setType: ex.drop_set ? "drop" : "normal",
    targetReps: ex.target_reps ?? "8-12",
    targetWeight: ex.target_weight ?? null,
    targetDistance: ex.targetDistance ?? null,
    targetDuration: ex.targetDuration ?? null,
    progressionStage: ex.progressionStage ?? null,
  }));
}

export function patchTemplateSets(ex, recipe) {
  const nextTemplateSets = recipe(ensureTemplateSets(ex)).map((set, index) => ({
    ...set,
    setIndex: set.setIndex ?? index + 1,
  }));
  return {
    ...ex,
    templateSets: nextTemplateSets,
    target_sets: nextTemplateSets.length,
    target_reps: nextTemplateSets[0]?.targetReps ?? "8-12",
    target_weight: nextTemplateSets[0]?.targetWeight ?? null,
    drop_set: nextTemplateSets.some((set) => set.setType === "drop"),
    effort: nextTemplateSets.some((set) => set.setType === "failure") ? "to_failure" : "normal",
  };
}
