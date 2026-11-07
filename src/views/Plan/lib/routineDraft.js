// Persistenter Entwurf noch ungespeicherter Vorlageneditor-Aenderungen
// (RoutineBuilder.jsx). Ein Entwurf ueberlebt Reload/Tab-Close und wird
// erst beim erfolgreichen Speichern geleert. Vorlagen koennen sich
// zwischenzeitlich anderswo geaendert haben: Patches fuer Uebungs-IDs,
// die in der geladenen Vorlage nicht mehr existieren, werden verworfen,
// der aktuelle Serverstand bleibt Ungespeichertem gegenueber massgeblich.
// Storage wird injiziert; localStorage-Fehler brechen den Editor nie ab.
const PREFIX = "plan.routineDraft.v1:";

function defaultStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function normalizePatches(patches) {
  if (!patches || typeof patches !== "object" || Array.isArray(patches)) return {};
  const kept = {};
  for (const [id, patch] of Object.entries(patches)) {
    if (patch && typeof patch === "object" && !Array.isArray(patch)) kept[id] = patch;
  }
  return kept;
}

export function loadRoutineDraft(storage = defaultStorage(), routineId) {
  let raw = null;
  try { raw = storage?.getItem(PREFIX + routineId) ?? null; } catch { return null; }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const patches = normalizePatches(value.patches);
    const hasName = typeof value.name === "string";
    const hasGoal = value.goal === null || typeof value.goal === "string";
    if (!hasName && !hasGoal && Object.keys(patches).length === 0) return null;
    return { name: hasName ? value.name : null, goal: hasGoal ? value.goal : undefined, patches };
  } catch { return null; }
}

export function saveRoutineDraft(storage = defaultStorage(), routineId, { name, goal, patches }) {
  const target = storage ?? defaultStorage();
  if (!target) return;
  try {
    target.setItem(PREFIX + routineId, JSON.stringify({
      name: typeof name === "string" ? name : null,
      goal: goal === null || typeof goal === "string" ? goal : null,
      patches: normalizePatches(patches),
      savedAt: Date.now(),
    }));
  } catch { /* Speicher voll/gesperrt: Entwurf ist optional. */ }
}

export function clearRoutineDraft(storage = defaultStorage(), routineId) {
  try { storage?.removeItem(PREFIX + routineId); } catch { /* nichts zu tun. */ }
}

export function patchesForExercises(patches, exercises) {
  const ids = new Set((exercises ?? []).map((ex) => ex?.id));
  const kept = {};
  for (const [id, patch] of Object.entries(normalizePatches(patches))) {
    if (ids.has(id)) kept[id] = patch;
  }
  return kept;
}

export function applyDraftToExercises(exercises, draft) {
  const patches = patchesForExercises(draft?.patches ?? {}, exercises);
  return (exercises ?? []).map((ex) => {
    const patch = patches[ex?.id];
    if (!patch) return ex;
    const merged = { ...ex, ...patch };
    if (typeof patch.trackingType === "string") {
      merged.weight_type = patch.trackingType === "bodyweight_reps" ? "bodyweight" : "kg";
    }
    return merged;
  });
}

export function applyDraftToRoutine(routine, draft) {
  if (!routine || !draft) return routine;
  return {
    ...routine,
    name: typeof draft.name === "string" ? draft.name : routine.name,
    goal: draft.goal === null || typeof draft.goal === "string" ? draft.goal : routine.goal,
  };
}
