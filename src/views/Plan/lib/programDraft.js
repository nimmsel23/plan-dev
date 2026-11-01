// Compatibility boundary for older Coach programs composed from template references.
export async function programToPlan(program, loadTemplate) {
  const routines = await Promise.all((program.workouts || []).map(async (item, index) => {
    const exercises = Array.isArray(item.exercises) ? item.exercises : (await loadTemplate(item.templateId)).exercises;
    return { ...item, id: item.id || `program-day-${index}`, label: item.label || 'Training', exercises: exercises || [], weekdays: item.weekdays || [] };
  }));
  return { id: program.id, updatedAt: program.updatedAt, name: program.name, description: program.description || '', totalWeeks: program.durationWeeks || 8, routines };
}
export function planToProgram(program, draft) {
  return { ...program, name: draft.name, description: draft.description, durationWeeks: draft.totalWeeks, workouts: draft.routines, expectedUpdatedAt: draft.expectedUpdatedAt };
}
