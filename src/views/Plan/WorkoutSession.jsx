import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Flag, Timer, Trash2 } from "lucide-react";
import { getUid } from '@db';
import { workoutTemplateExercises } from './lib/workoutTemplate.js';
import { createWorkoutDraft } from './lib/workoutDraft.js';
import { createPlanApi } from "./api.js";
import ExerciseSearch from "./components/ExerciseSearch.jsx";
import ExerciseBlock from "./components/ExerciseBlock.jsx";
import ExerciseDetail from "./components/ExerciseDetail.jsx";
import WorkoutSummary from "./components/WorkoutSummary.jsx";
import { REST_TIMER_TAG, readStoredRestTimer, writeStoredRestTimer, sendRestTimerNotification } from "./lib/restTimer.js";
import { buildExerciseHistory, previousSetsFor, workoutPRs, formatClock } from "./lib/history.js";
import { readActiveWorkout, writeActiveWorkout } from "./lib/activeWorkout.js";

// Satz-Änderungen werden lokal sofort angezeigt und gebündelt nachgespeichert
// (Strong verliert nie einen Satz, auch wenn die App zwischendurch zugeht).
const AUTOSAVE_DELAY_MS = 1200;

export default function WorkoutSession({ workoutId, onBack, onFinished }) {
  const [workout, setWorkout] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  const [restTimer, setRestTimer] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [allWorkouts, setAllWorkouts] = useState([]);
  const [detailKey, setDetailKey] = useState(null);
  const [summary, setSummary] = useState(null);
  const [saveState, setSaveState] = useState('saved');
  const [error, setError] = useState('');
  const ownerUid = useMemo(() => getUid(), []);
  const api = useMemo(() => createPlanApi(ownerUid), [ownerUid]);
  const writer = useMemo(() => createWorkoutDraft({
    key: `plan-workout-draft:${ownerUid}:${workoutId}`,
    storage: localStorage,
    write: (snapshot) => api.patch(`/workouts/${workoutId}`, { exercises: snapshot }),
    onState: setSaveState,
  }), [workoutId]);
  const exercisesRef = useRef([]);
  const saveTimerRef = useRef(null);

  async function load() {
    const d = await api.get(`/workouts/${workoutId}`);
    setWorkout(d.workout);
    const restored = !d.workout.finished_at && writer.read();
    const next = restored || d.workout.exercises;
    setExercises(next);
    exercisesRef.current = next;
    if (restored) writer.stage(restored);
    if (!d.workout.finished_at) {
      writeActiveWorkout({ id: workoutId, name: d.workout.name, started_at: d.workout.started_at }, ownerUid);
    }
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, [workoutId]);

  // Historie für "Vorher"-Spalte + Übungsdetail. Ein Listen-Call reicht,
  // weil der eventLog auf dem Workout-Meta-Dokument liegt.
  useEffect(() => {
    api.get("/workouts").then((d) => setAllWorkouts(d.workouts || [])).catch(() => {});
  }, [workoutId]);

  const history = useMemo(() => buildExerciseHistory(allWorkouts), [allWorkouts]);

  useEffect(() => () => {
    // Beim Verlassen ausstehende Satz-Änderungen nicht verlieren.
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      writer.save().catch(() => {});
    }
  }, [workoutId]);

  function scheduleSave() {
    writer.stage(exercisesRef.current);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      writer.save().catch(() => {});
    }, AUTOSAVE_DELAY_MS);
  }

  // Vor strukturellen Server-Änderungen (Satz/Übung hinzufügen/löschen)
  // erst die lokalen Eingaben sichern, sonst überschreibt load() sie.
  async function flushSave() {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    await writer.flush();
  }

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') writer.save().catch(() => {}); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [writer]);

  // Workout-Uhr (Strong zeigt die laufende Dauer im Kopf).
  useEffect(() => {
    if (!workout || workout.finished_at) return undefined;
    const tick = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [workout]);

  useEffect(() => {
    setRestTimer(readStoredRestTimer(workoutId));
  }, [workoutId]);

  useEffect(() => {
    if (!restTimer?.targetTime) return undefined;
    const tick = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, [restTimer?.targetTime]);

  useEffect(() => {
    if (!restTimer?.targetTime) {
      writeStoredRestTimer(workoutId, null);
      sendRestTimerNotification(null).catch(() => {});
      return;
    }
    writeStoredRestTimer(workoutId, restTimer);
    sendRestTimerNotification(restTimer).catch(() => {});
  }, [workoutId, restTimer]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      setNowMs(Date.now());
      setRestTimer(readStoredRestTimer(workoutId));
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [workoutId]);

  useEffect(() => {
    if (!restTimer?.targetTime) return;
    if (restTimer.targetTime > nowMs) return;
    setRestTimer(null);
    sendRestTimerNotification({
      ...restTimer,
      targetTime: Date.now(),
    }).catch(() => {});
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Satzpause beendet", {
        body: `${restTimer.exerciseName || "Übung"} · weiter`,
        tag: REST_TIMER_TAG,
        silent: false,
      });
    }
  }, [nowMs, restTimer]);

  const restRemainingMs = restTimer?.targetTime ? Math.max(0, restTimer.targetTime - nowMs) : 0;
  const restRemainingLabel = useMemo(() => {
    const totalSeconds = Math.ceil(restRemainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [restRemainingMs]);

  async function primeNotificationPermission() {
    if (typeof Notification === "undefined" || Notification.permission !== "default") return;
    try { await Notification.requestPermission(); } catch {}
  }

  function startRestTimer(exercise, set) {
    const restSeconds = Number(exercise?.rest_seconds) || 0;
    if (restSeconds <= 0) return;
    const nextTimer = {
      workoutId,
      exerciseId: exercise.id,
      setId: set.id,
      exerciseName: exercise.name,
      targetTime: Date.now() + restSeconds * 1000,
      restSeconds,
    };
    setNowMs(Date.now());
    setRestTimer(nextTimer);
  }

  async function addExercise(ex) {
    await flushSave();
    await api.post(`/workouts/${workoutId}/exercises`, {
      exercise_id: ex.id,
      name: ex.name,
      primaryMuscles: ex.primaryMuscles,
      secondaryMuscles: ex.secondaryMuscles,
      yuhonas_id: ex.yuhonas_id,
      equipment: ex.equipment || [],
      instructions: ex.instructions || [],
      trackingType: ex.trackingType || "weight_reps",
    });
    await load();
  }

  async function removeExercise(rowId) {
    await flushSave();
    await api.delete(`/workouts/${workoutId}/exercises/${rowId}`);
    await load();
  }

  async function addSet(exerciseId) {
    await flushSave();
    await api.post(`/workouts/${workoutId}/exercises/${exerciseId}/sets`, {});
    await load();
  }

  function patchSetLocal(exerciseId, setId, patch) {
    const next = exercisesRef.current.map((e) => e.id !== exerciseId ? e : {
      ...e,
      sets: e.sets.map((s) => s.id === setId ? { ...s, ...patch } : s),
    });
    exercisesRef.current = next;
    setExercises(next);
    scheduleSave();
  }

  async function deleteSet(exerciseId, setId) {
    await flushSave();
    await api.delete(`/workouts/${workoutId}/exercises/${exerciseId}/sets/${setId}`);
    await load();
  }

  async function finishWorkout() {
    const completedCount = exercises.reduce((n, e) => n + (e.sets || []).filter((s) => s.completed).length, 0);
    const openCount = exercises.reduce((n, e) => n + (e.sets || []).filter((s) => !s.completed).length, 0);
    if (completedCount === 0) {
      alert("Noch kein Satz abgehakt. Hake erledigte Sätze mit ✓ ab, oder verwirf das Workout.");
      return;
    }
    if (openCount > 0 && !confirm(`${openCount} Satz/Sätze nicht abgehakt — werden nicht gewertet. Workout beenden?`)) return;
    let finished = null;
    setSaving(true);
    try {
      setRestTimer(null);
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const finishedAt = new Date().toISOString();
      const patch = {
        exercises,
        finished_at: finishedAt,
        sessionState: "completed",
        eventLog: exercises.flatMap((exercise) =>
          (exercise.sets || [])
            .filter((set) => set.completed)
            .map((set) => ({
              exercise_id: exercise.exercise_id,
              name: exercise.name,
              setId: set.id,
              metricType:
                exercise.trackingType === "weight_reps" ? "weight_reps"
                  : exercise.trackingType === "distance_time" ? "distance_time"
                    : exercise.trackingType === "duration" ? "seconds"
                      : "reps",
              reps: set.reps ?? null,
              weight: set.weight ?? null,
              distance: set.distance ?? null,
              seconds: set.duration ?? null,
              progressionStage: set.progressionStage ?? null,
              completedAt: finishedAt,
            }))
        ),
      };
      await flushSave();
      await api.patch(`/workouts/${workoutId}`, patch);
      writer.clear();
      const { exercises: _ignored, ...meta } = patch;
      finished = { ...workout, ...meta, id: workoutId };
    } finally {
      setSaving(false);
    }
    if (readActiveWorkout(ownerUid)?.id === workoutId) writeActiveWorkout(null, ownerUid);
    setSummary({ workout: finished, prs: workoutPRs(finished, allWorkouts) });
  }

  async function discardWorkout() {
    if (!confirm("Workout verwerfen? Alle Sätze dieses Workouts werden gelöscht.")) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setRestTimer(null);
    await writer.flush();
    await api.delete(`/workouts/${workoutId}`);
    writer.clear();
    if (readActiveWorkout(ownerUid)?.id === workoutId) writeActiveWorkout(null, ownerUid);
    onFinished();
  }

  // Basis-Funktion des Plan-Tabs: ein frei geloggtes Workout soll direkt als
  // wiederverwendbare Vorlage (Template) gespeichert werden können, nicht
  // nur andersrum (Template -> Workout starten). Ohne das war der einzige
  // Weg zu einer Vorlage der abstrakte RoutineBuilder, ohne je etwas real
  // geloggt zu haben — genau der Bruch, den der Umbau auf Routinen/Workouts
  // (getrennte Objekte) eingeführt hatte.
  async function saveAsTemplate() {
    const name = prompt("Name für die neue Vorlage:", workout.name || "Workout");
    if (!name || !name.trim()) return;
    setSaving(true);
    try {
      const routine = await api.post("/routines", { name: name.trim(), goal: null });
      await api.patch(`/routines/${routine.id}`, { exercises: workoutTemplateExercises({ exercises }) });
      alert(`"${name.trim()}" als Vorlage gespeichert.`);
    } finally {
      setSaving(false);
    }
  }

  const excludeIds = exercises.map((e) => e.exercise_id);

  if (summary) {
    return <WorkoutSummary workout={summary.workout} prs={summary.prs} onDone={onFinished}
      onSaveFeedback={async (feedback) => { await api.patch(`/workouts/${workoutId}`, { feedback }); }}
      onSaveTemplate={saveAsTemplate}
      onUpdateTemplate={workout.routine_id && !workout.sourcePlanId ? async () => {
        await api.patch(`/routines/${workout.routine_id}`, { exercises: workoutTemplateExercises({ exercises }) });
      } : undefined} />;
  }

  if (!workout && error) return <div role="alert" className="p-6 text-fit-red">{error}<button onClick={() => { setError(''); load().catch((err) => setError(err.message)); }} className="ml-3 underline">Erneut versuchen</button></div>;

  if (!workout) return <div className="flex items-center justify-center min-h-[100dvh] text-fit-muted text-sm">Lädt…</div>;

  const startedMs = Date.parse(workout.started_at);
  const elapsedLabel = workout.finished_at || !Number.isFinite(startedMs) ? null : formatClock(nowMs - startedMs);
  const detailEntries = detailKey ? history.get(detailKey) || [] : [];
  const detailName = detailKey ? (exercises.find((e) => (e.exercise_id || e.name) === detailKey)?.name || detailKey) : "";

  return (
    <fieldset disabled={saving} className="min-w-0 max-w-2xl mx-auto border-0 px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={async () => { try { await flushSave(); onBack(); } catch (err) { setError(err.message); } }} className="p-2 rounded-xl text-fit-muted hover:text-fit-ink hover:bg-fit-bg2 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">{workout.name}</h1>
          {elapsedLabel && (
            <div className="flex items-center gap-1 text-xs font-mono text-fit-muted">
              <Timer size={12} /> {elapsedLabel}
            </div>
          )}
        </div>
        <button
          disabled={saving || exercises.length === 0}
          onClick={() => saveAsTemplate().catch((err) => setError(err.message))}
          title="Dieses Workout als wiederverwendbare Vorlage speichern"
          className="flex h-11 shrink-0 items-center gap-1.5 px-3 rounded-xl bg-fit-card hover:bg-fit-accent/10 text-fit-ink text-sm font-medium disabled:opacity-50 transition-colors"
        >
          Als Vorlage
        </button>
        <button
          disabled={saving}
          onClick={async () => {
            try { await finishWorkout(); } catch (err) { setError(err.message || "Abschluss fehlgeschlagen. Bitte erneut versuchen."); }
          }}
          className="flex h-11 shrink-0 items-center gap-2 px-3 sm:px-4 rounded-xl bg-fit-accent text-fit-bg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          <Flag size={14} strokeWidth={2.7} /> Fertig
        </button>
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-fit-red">{error}</p>}
      <div aria-live="polite" className="mb-4 flex items-center justify-between text-xs text-fit-muted">
        <span>{saveState === 'saved' ? 'Alle Änderungen gespeichert' : saveState === 'saving' ? 'Speichert…' : saveState === 'error' ? 'Cloud-Speicherung fehlgeschlagen · Entwurf auf diesem Gerät' : saveState === 'storage-error' ? 'Lokaler Speicher voll · App bis zum Speichern offen halten' : 'Änderungen auf diesem Gerät gesichert'}</span>
        {saveState !== 'saved' && <button onClick={() => flushSave().catch((err) => setError(err.message))} className="text-fit-accent">Jetzt speichern</button>}
      </div>
      {restTimer && (
        <div className="sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-30 mb-4 rounded-2xl border border-fit-line bg-fit-card/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-fit-muted">Rest Timer</div>
            <div className="text-sm font-semibold text-fit-ink">{restTimer.exerciseName}</div>
          </div>
          <div className="text-lg font-mono text-fit-ink">{restRemainingLabel}</div>
          <button
            onClick={() => setRestTimer(null)}
            className="px-3 py-1.5 rounded-lg bg-fit-bg2 text-fit-muted text-xs font-semibold hover:text-fit-ink transition-colors"
          >
            Stop
          </button>
        </div>
      )}

      <div className="mb-5">
        <ExerciseSearch onAdd={addExercise} exclude={excludeIds} />
      </div>

      {exercises.length === 0 ? (
        <div className="text-center py-14 text-fit-muted text-sm">
          Noch keine Übungen. Suche oben nach einer Übung.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {exercises.map((ex) => (
            <ExerciseBlock
              key={ex.id}
              ex={ex}
              previousSets={previousSetsFor(history, ex.exercise_id || ex.name, workoutId)}
              onShowHistory={() => setDetailKey(ex.exercise_id || ex.name)}
              onAddSet={() => addSet(ex.id).catch((err) => setError(err.message))}
              onPatchSet={(setId, patch) => patchSetLocal(ex.id, setId, patch)}
              onDeleteSet={(setId) => deleteSet(ex.id, setId).catch((err) => setError(err.message))}
              onDeleteExercise={() => removeExercise(ex.id).catch((err) => setError(err.message))}
              onCompletedSet={(set) => {
                primeNotificationPermission().catch(() => {});
                startRestTimer(ex, set);
              }}
            />
          ))}
        </div>
      )}

      {!workout.finished_at && (
        <button
          onClick={() => discardWorkout().catch((err) => setError(err.message))}
          disabled={saving}
          className="mt-8 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-fit-red bg-red-500/10 hover:bg-red-500/20 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <Trash2 size={14} /> Workout verwerfen
        </button>
      )}

      {detailKey && (
        <ExerciseDetail name={detailName} entries={detailEntries} onClose={() => setDetailKey(null)} />
      )}
    </fieldset>
  );
}
