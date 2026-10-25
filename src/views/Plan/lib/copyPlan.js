import { getMacrocycle, createMacrocycle } from '@db';
import { hasUnpublishedChanges } from './planVersions.js';

// Kopiert den Arbeitsstand eines Trainingsplans als Entwurf zu einem anderen Klienten
// – in einem einzigen Schreibvorgang, es gibt also keinen halb kopierten Plan. Der
// veröffentlichte Stand wird nicht mitkopiert. Die Einheiten sind eigenständige
// Snapshots; die Vorlage des Quell-Klienten existiert beim Ziel nicht (sourceTemplateId → null).
export async function copyPlanToClient({ fromUid, planId, toUid, coachUid }) {
  const source = (await getMacrocycle(fromUid, planId))?.macrocycle;
  if (!source) throw new Error('Quellplan konnte nicht geladen werden.');
  const created = await createMacrocycle(toUid, {
    name: source.name,
    description: source.description || '',
    totalWeeks: source.totalWeeks,
    coachUid,
    status: 'draft',
    routines: (source.routines || []).map((r) => ({ ...r, sourceTemplateId: null })),
  });
  if (!created?.id) throw new Error('Kopie konnte nicht angelegt werden.');
  return { plan: created, fromWorkingCopy: true, hadUnpublished: hasUnpublishedChanges(source) };
}
