import test from "node:test";
import assert from "node:assert/strict";
import {
  applyDraftToExercises,
  applyDraftToRoutine,
  clearRoutineDraft,
  loadRoutineDraft,
  patchesForExercises,
  saveRoutineDraft,
} from "../src/views/Plan/lib/routineDraft.js";

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
}

test("save/load Roundtrip gibt Name, Ziel und Patches normalisiert zurueck", () => {
  const storage = fakeStorage();
  saveRoutineDraft(storage, "r1", {
    name: " Push A ",
    goal: "Hypertrophie",
    patches: { e1: { target_reps: "6-8" }, e2: { trackingType: "bodyweight_reps" } },
  });
  const draft = loadRoutineDraft(storage, "r1");
  assert.equal(draft.name, " Push A ");
  assert.equal(draft.goal, "Hypertrophie");
  assert.deepEqual(draft.patches, {
    e1: { target_reps: "6-8" },
    e2: { trackingType: "bodyweight_reps" },
  });
});

test("load ohne und mit kaputtem Entwurf liefert null", () => {
  const storage = fakeStorage();
  assert.equal(loadRoutineDraft(storage, "r1"), null);
  storage.setItem("plan.routineDraft.v1:r1", "{kein json");
  assert.equal(loadRoutineDraft(storage, "r1"), null);
  storage.setItem("plan.routineDraft.v1:r1", JSON.stringify({ patches: "kein objekt" }));
  assert.equal(loadRoutineDraft(storage, "r1"), null);
});

test("clearRoutineDraft entfernt den Entwurf", () => {
  const storage = fakeStorage();
  saveRoutineDraft(storage, "r1", { name: "A", goal: null, patches: { e1: { drop_set: true } } });
  clearRoutineDraft(storage, "r1");
  assert.equal(loadRoutineDraft(storage, "r1"), null);
});

test("patchesForExercises verwirft IDs, die es nicht mehr gibt", () => {
  const exercises = [{ id: "e1" }, { id: "e2" }];
  const kept = patchesForExercises(
    { e1: { target_reps: "6-8" }, entfaellt: { target_reps: "1" } },
    exercises,
  );
  assert.deepEqual(Object.keys(kept), ["e1"]);
});

test("applyDraftToExercises mischt Patches und leitet weight_type ab", () => {
  const exercises = [{ id: "e1", trackingType: "weight_reps", weight_type: "kg" }];
  const merged = applyDraftToExercises(exercises, {
    patches: { e1: { trackingType: "bodyweight_reps" }, entfaellt: { target_reps: "1" } },
  });
  assert.equal(merged.length, 1);
  assert.equal(merged[0].trackingType, "bodyweight_reps");
  assert.equal(merged[0].weight_type, "bodyweight");
  // Uebung ohne Patch bleibt unveraendert (gleiche Referenz).
  const untouched = [{ id: "e9", target_reps: "8-12" }];
  assert.equal(applyDraftToExercises(untouched, { patches: { e1: {} } })[0], untouched[0]);
});

test("applyDraftToRoutine uebernimmt nur vorhandene Werte", () => {
  const routine = { id: "r1", name: "Bein-Tag", goal: "Kraft" };
  const renamed = applyDraftToRoutine(routine, { name: "Pull-Tag", goal: null, patches: {} });
  assert.equal(renamed.name, "Pull-Tag");
  assert.equal(renamed.goal, null);
  const ohneZiel = applyDraftToRoutine(routine, { name: null, goal: undefined, patches: {} });
  assert.equal(ohneZiel.name, "Bein-Tag");
  assert.equal(ohneZiel.goal, "Kraft");
  assert.equal(applyDraftToRoutine(routine, null), routine);
  assert.equal(applyDraftToRoutine(null, { name: "x" }), null);
});

test("saveRoutineDraft bricht bei defektem Storage nicht ab", () => {
  const broken = {
    getItem: () => { throw new Error("gesperrt"); },
    setItem: () => { throw new Error("voll"); },
    removeItem: () => { throw new Error("gesperrt"); },
  };
  saveRoutineDraft(broken, "r1", { name: "A", goal: null, patches: { e1: {} } });
  assert.equal(loadRoutineDraft(broken, "r1"), null);
  clearRoutineDraft(broken, "r1");
});
