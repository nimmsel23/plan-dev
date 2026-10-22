import { getMacrocycle, createMacrocycle, addRoutine, updateRoutine } from '@db';

// Kopiert einen Trainingsplan als Entwurf zu einem anderen Klienten. Die Einheiten
// sind ohnehin eigenständige Snapshots, daher brauchen die Ziel-Klienten keine
// Vorlagen; Fortschritt zählt über die in den Workouts gespeicherte routine_id.
export async function copyPlanToClient({ fromUid, planId, toUid, coachUid }) {
  const source = (await getMacrocycle(fromUid, planId))?.macrocycle;
  if (!source) throw new Error('Quellplan konnte nicht geladen werden.');
  const created = await createMacrocycle(toUid, {
    name: source.name,
    description: source.description || '',
    totalWeeks: source.totalWeeks,
    coachUid,
    status: 'draft',
  });
  if (!created?.id) throw new Error('Kopie konnte nicht angelegt werden.');
  for (const r of source.routines || []) {
    const updated = await addRoutine(toUid, created.id, {
      label: r.label, isDeload: r.isDeload, restHoursAfter: r.restHoursAfter,
      targetCount: r.targetCount, targetPeriodDays: r.targetPeriodDays,
      sourceTemplateId: r.sourceTemplateId, exercises: r.exercises || [], weekdays: r.weekdays || [],
    });
    const added = updated?.routines?.at(-1);
    if (!added) throw new Error(`Einheit „${r.label}“ konnte nicht kopiert werden.`);
    // Das lokale Backend übernimmt Übungen beim Anlegen nicht immer.
    if (!added.exercises?.length && r.exercises?.length && !await updateRoutine(toUid, created.id, added.id, { exercises: r.exercises })) {
      throw new Error(`Übungen von „${r.label}“ konnten nicht kopiert werden.`);
    }
  }
  return created;
}
