// Strong-artige Auswertung der Trainingshistorie — reine Datenlogik, kein JSX.
//
// Quelle sind ausschließlich abgeschlossene Workouts (`finished_at` gesetzt)
// und deren `eventLog` (ein Eintrag pro erledigtem Satz, geschrieben von
// WorkoutSession.finishWorkout()). Der eventLog liegt direkt auf dem
// Workout-Meta-Dokument, d.h. `api.get('/workouts')` reicht für Verlauf,
// "Vorher"-Spalte, Rekorde und Diagramme — keine Subcollection-Reads.

export function isFinished(workout) {
  return Boolean(workout?.finished_at);
}

export function finishedWorkouts(workouts = []) {
  return workouts
    .filter(isFinished)
    .sort((a, b) => new Date(b.finished_at) - new Date(a.finished_at));
}

// Epley-Formel — dieselbe Schätzung, die Strong für "Est. 1RM" nutzt.
export function estimate1RM(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!(w > 0) || !(r > 0)) return 0;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

export function setVolume(set) {
  const w = Number(set?.weight);
  const r = Number(set?.reps);
  return w > 0 && r > 0 ? w * r : 0;
}

export function prettyExerciseName(entry) {
  if (entry?.name) return entry.name;
  const id = String(entry?.exercise_id || "Übung");
  return id.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// eventLog → [{ exercise_id, name, metricType, sets: [...] }] in Log-Reihenfolge.
export function groupWorkoutSets(workout) {
  const groups = new Map();
  for (const entry of workout?.eventLog || []) {
    const key = entry.exercise_id || entry.name || "unknown";
    if (!groups.has(key)) {
      groups.set(key, {
        exercise_id: entry.exercise_id || null,
        name: prettyExerciseName(entry),
        metricType: entry.metricType || "reps",
        sets: [],
      });
    }
    groups.get(key).sets.push(entry);
  }
  return [...groups.values()];
}

export function workoutDurationMs(workout) {
  const start = Date.parse(workout?.started_at);
  const end = Date.parse(workout?.finished_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return end - start;
}

export function formatDuration(ms) {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  return `${Math.floor(totalMin / 60)} h ${totalMin % 60} min`;
}

export function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatKg(value) {
  const n = Number(value) || 0;
  return `${Math.round(n * 10) / 10}`.replace(".", ",");
}

export function formatSet(set, metricType = set?.metricType) {
  if (!set) return "–";
  if (metricType === "weight_reps") {
    if (set.weight == null && set.reps == null) return "–";
    return `${formatKg(set.weight ?? 0)} kg × ${set.reps ?? 0}`;
  }
  if (metricType === "distance_time") {
    return `${formatKg(set.distance ?? 0)} km · ${set.seconds ?? set.duration ?? 0} min`;
  }
  if (metricType === "seconds") return `${set.seconds ?? set.duration ?? 0} s`;
  return `${set.reps ?? 0} Wdh`;
}

export function workoutTotals(workout) {
  let volume = 0;
  let sets = 0;
  for (const entry of workout?.eventLog || []) {
    volume += setVolume(entry);
    sets += 1;
  }
  return { volume, sets, durationMs: workoutDurationMs(workout) };
}

// Bester Satz einer Übung innerhalb eines Workouts (Strong: "Best Set").
export function bestSet(sets = []) {
  let best = null;
  let bestScore = -1;
  for (const s of sets) {
    const score = estimate1RM(s.weight, s.reps) || Number(s.reps) || Number(s.seconds) || Number(s.distance) || 0;
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

// exercise_id → [{ workoutId, date, workoutName, sets }] neueste zuerst.
export function buildExerciseHistory(workouts = []) {
  const history = new Map();
  for (const w of finishedWorkouts(workouts)) {
    for (const group of groupWorkoutSets(w)) {
      const key = group.exercise_id || group.name;
      if (!history.has(key)) history.set(key, []);
      history.get(key).push({
        workoutId: w.id,
        workoutName: w.name,
        date: w.finished_at,
        name: group.name,
        metricType: group.metricType,
        sets: group.sets,
      });
    }
  }
  return history;
}

// Übersicht für den Übungen-Tab.
export function exerciseIndex(history) {
  return [...history.entries()]
    .map(([key, entries]) => ({
      key,
      name: entries[0]?.name || key,
      metricType: entries[0]?.metricType,
      count: entries.length,
      lastDate: entries[0]?.date,
      lastBest: bestSet(entries[0]?.sets || []),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

// "Vorher"-Spalte: Sätze der letzten abgeschlossenen Ausführung dieser Übung
// (ohne das aktuell laufende Workout), indexgleich zu den aktuellen Sätzen.
export function previousSetsFor(history, exerciseId, excludeWorkoutId) {
  const entries = history?.get(exerciseId) || [];
  const last = entries.find((e) => e.workoutId !== excludeWorkoutId);
  return last ? last.sets : [];
}

export function exerciseRecords(entries = []) {
  const rec = { best1RM: null, maxWeight: null, maxReps: null, maxVolumeSet: null, maxVolumeSession: null };
  for (const e of entries) {
    let sessionVolume = 0;
    for (const s of e.sets) {
      const est = estimate1RM(s.weight, s.reps);
      const vol = setVolume(s);
      sessionVolume += vol;
      if (est > 0 && (!rec.best1RM || est > rec.best1RM.value)) rec.best1RM = { value: est, set: s, date: e.date };
      if (Number(s.weight) > 0 && (!rec.maxWeight || Number(s.weight) > rec.maxWeight.value)) rec.maxWeight = { value: Number(s.weight), set: s, date: e.date };
      if (Number(s.reps) > 0 && (!rec.maxReps || Number(s.reps) > rec.maxReps.value)) rec.maxReps = { value: Number(s.reps), set: s, date: e.date };
      if (vol > 0 && (!rec.maxVolumeSet || vol > rec.maxVolumeSet.value)) rec.maxVolumeSet = { value: vol, set: s, date: e.date };
    }
    if (sessionVolume > 0 && (!rec.maxVolumeSession || sessionVolume > rec.maxVolumeSession.value)) {
      rec.maxVolumeSession = { value: sessionVolume, date: e.date };
    }
  }
  return rec;
}

// Chart-Reihe (älteste zuerst) pro Workout: bestes geschätztes 1RM,
// schwerstes Gewicht und Gesamtvolumen.
export function exerciseSeries(entries = []) {
  return entries
    .slice()
    .reverse()
    .map((e) => {
      let best1RM = 0;
      let maxWeight = 0;
      let volume = 0;
      let maxReps = 0;
      for (const s of e.sets) {
        best1RM = Math.max(best1RM, estimate1RM(s.weight, s.reps));
        maxWeight = Math.max(maxWeight, Number(s.weight) || 0);
        maxReps = Math.max(maxReps, Number(s.reps) || 0);
        volume += setVolume(s);
      }
      return {
        date: e.date,
        label: new Date(e.date).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" }),
        best1RM: Math.round(best1RM * 10) / 10,
        maxWeight,
        maxReps,
        volume: Math.round(volume),
      };
    });
}

// Persönliche Rekorde, die ein Workout gegenüber ALLEN früheren Workouts
// aufgestellt hat (Strong zeigt sie im Verlauf und im Abschluss-Screen).
export function workoutPRs(workout, allWorkouts = []) {
  const finishedAt = Date.parse(workout?.finished_at || workout?.eventLog?.[0]?.completedAt);
  const earlier = finishedWorkouts(allWorkouts).filter(
    (w) => w.id !== workout?.id && Date.parse(w.finished_at) < finishedAt
  );
  const history = buildExerciseHistory(earlier);
  const prs = [];
  for (const group of groupWorkoutSets(workout)) {
    const before = exerciseRecords(history.get(group.exercise_id || group.name) || []);
    const now = exerciseRecords([{ sets: group.sets, date: workout.finished_at }]);
    const hadHistory = history.has(group.exercise_id || group.name);
    if (!hadHistory) continue;
    if (now.best1RM && (!before.best1RM || now.best1RM.value > before.best1RM.value + 0.01)) {
      prs.push({ name: group.name, kind: "Geschätztes 1RM", value: `${formatKg(now.best1RM.value)} kg` });
    }
    if (now.maxWeight && (!before.maxWeight || now.maxWeight.value > before.maxWeight.value)) {
      prs.push({ name: group.name, kind: "Gewicht", value: `${formatKg(now.maxWeight.value)} kg` });
    }
    if (now.maxVolumeSet && (!before.maxVolumeSet || now.maxVolumeSet.value > before.maxVolumeSet.value)) {
      prs.push({ name: group.name, kind: "Satzvolumen", value: `${formatKg(now.maxVolumeSet.value)} kg` });
    }
  }
  return prs;
}

// Montag 00:00 der Woche von `date` (lokal).
export function weekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

export function workoutsPerWeek(workouts = [], weeks = 8, now = new Date()) {
  const current = weekStart(now);
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(current);
    start.setDate(start.getDate() - (weeks - 1 - i) * 7);
    return {
      start,
      label: start.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" }),
      count: 0,
    };
  });
  for (const w of finishedWorkouts(workouts)) {
    const ws = weekStart(w.finished_at).getTime();
    const bucket = buckets.find((b) => b.start.getTime() === ws);
    if (bucket) bucket.count += 1;
  }
  return buckets;
}
