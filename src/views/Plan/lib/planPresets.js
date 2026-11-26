import { WORKOUT_CATALOG, findWorkoutTemplate, generateWorkoutPlan } from './workoutGenerator.js';

// The existing picker and the CLI consume the same JSON-backed basic templates.
// goal + equipment are carried over from the catalog template for grouped UI rendering.
export const PLAN_PRESETS = WORKOUT_CATALOG.templates.map((template) => ({
  id: template.id,
  goal: template.goal ?? 'hypertrophy',
  equipment: template.equipment ?? ['gym'],
  ...generateWorkoutPlan({ name: template.name.slice(0, 60), level: template.defaultLevel, template: template.id }),
}));

export function planFromPreset(id) {
  const template = findWorkoutTemplate(id);
  const { name, description, totalWeeks, routines } = generateWorkoutPlan({
    name: template.name.slice(0, 60), level: template.defaultLevel, template: id,
  });
  return { name, description, totalWeeks, routines };
}
