import { useEffect, useState } from "react";
import { Dumbbell, Plus, Settings2, FolderPlus } from "lucide-react";
import { api } from "./api.js";
import { pickNextRoutine } from "../../lib/habitProgress.js";
import { quickCompleteRoutine } from "../../lib/quickComplete.js";
import TrainingPlans from "./TrainingPlans.jsx";
import RoutineFolder from "./components/RoutineFolder.jsx";
import CalisthenicsSkillsSection from "./components/CalisthenicsSkillsSection.jsx";
import NextUpCard from "./components/NextUpCard.jsx";
import { groupRoutinesIntoFolders } from "./lib/splitFolders.js";

// Reine Orchestrierung: lädt Templates+Workouts, hält die Aktionen
// (quickComplete/rename/setCategory/delete), rendert die Struktur-Bausteine
// aus components/. Kein UI-Markup mehr direkt hier außer Header/Schnellstart
// (zu klein, um eine eigene Datei zu rechtfertigen).
const EMPTY_FOLDERS_KEY = "wf-empty-folders";

function loadEmptyFolders() {
  try {
    return JSON.parse(localStorage.getItem(EMPTY_FOLDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function WorkoutList({ onEditRoutine, onOpenWorkout, onSettings }) {
  const [routines, setRoutines] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);
  const [toast, setToast] = useState('');
  // Ordner bestehen implizit über `routine.category` — ein frisch angelegter,
  // noch leerer Ordner hätte sonst keine Repräsentation. Namen leerer Ordner
  // werden deshalb zusätzlich lokal gemerkt, bis die erste Routine hineinzieht.
  const [emptyFolders, setEmptyFolders] = useState(loadEmptyFolders);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  async function load() {
    setLoading(true);
    const [routinesRes, workoutsRes] = await Promise.all([
      api.get("/routines"),
      api.get("/workouts"),
    ]);
    setRoutines(routinesRes.routines);
    setWorkouts(workoutsRes.workouts || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const nextRoutine = !loading ? pickNextRoutine(routines, workouts) : null;

  const plainRoutines = routines.filter((r) => r.category !== "calisthenics-skill");
  // Ordner = gesetzte Kategorie, sonst automatisch erkannter Split aus dem
  // Namen (lib/splitFolders.js) — "Push A"/"Brust & Trizeps" landen von
  // selbst im Push-Ordner. Zusätzlich manuell angelegte, noch leere Ordner
  // (emptyFolders) einmischen, die sonst keine Repräsentation hätten.
  const { folders, folderNames: detectedFolderNames, uncategorized } = groupRoutinesIntoFolders(plainRoutines);
  for (const name of emptyFolders) {
    if (!folders[name]) folders[name] = [];
  }
  const folderNames = Array.from(new Set([...detectedFolderNames, ...emptyFolders]));

  async function quickStart() {
    const d = await api.post("/workouts", {});
    onOpenWorkout(d.id);
  }

  async function startFromRoutine(routineId) {
    const d = await api.post("/workouts", { routine_id: routineId });
    onOpenWorkout(d.id);
  }

  // Alternative zum vollen WorkoutSession-Log: Routine wird direkt als
  // "heute erledigt" gespeichert, jeder Satz übernimmt automatisch den
  // besten verfügbaren Wert (siehe lib/quickComplete.js) statt Satz für
  // Satz manuell einzutragen. Bleibt auf WorkoutList, keine Navigation.
  async function quickComplete(routine) {
    setCompletingId(routine.id);
    try {
      await quickCompleteRoutine(api, routine.id);
      showToast(`${routine.name} erledigt ✓`);
    } catch {
      showToast('Fehler beim Speichern');
    } finally {
      setCompletingId(null);
    }
  }

  async function renameRoutine(r) {
    const name = prompt("Neuer Name:", r.name);
    if (!name || !name.trim() || name.trim() === r.name) return;
    await api.patch(`/routines/${r.id}`, { name: name.trim() });
    load();
  }

  async function setCategory(r) {
    const category = prompt("Ordner (z.B. Push, Pull, Legs) — leer lassen zum Entfernen:", r.category || "");
    if (category === null) return;
    await api.patch(`/routines/${r.id}`, { category: category.trim() || null });
    load();
  }

  async function deleteRoutine(id) {
    if (!confirm("Routine löschen?")) return;
    await api.delete(`/routines/${id}`);
    load();
  }

  function createFolder() {
    const name = prompt("Name des neuen Ordners (z.B. Push, Pull, Legs):");
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (folders[trimmed]) { showToast("Ordner existiert bereits"); return; }
    const next = [...emptyFolders, trimmed];
    setEmptyFolders(next);
    localStorage.setItem(EMPTY_FOLDERS_KEY, JSON.stringify(next));
  }

  function deleteEmptyFolder(name) {
    const next = emptyFolders.filter((n) => n !== name);
    setEmptyFolders(next);
    localStorage.setItem(EMPTY_FOLDERS_KEY, JSON.stringify(next));
  }

  async function newRoutine() {
    const d = await api.post("/routines", { name: `Routine ${new Date().toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" })}`, goal: null });
    onEditRoutine(d.id);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <span className="text-xs font-bold text-fit-muted uppercase tracking-wide">Training</span>
          <h1 className="text-2xl font-bold tracking-tight text-fit-ink">Workout beginnen</h1>
        </div>
        <button
          onClick={onSettings}
          className="p-2 rounded-xl text-fit-muted hover:text-fit-ink hover:bg-fit-bg2 transition-colors"
          title="Einstellungen"
        >
          <Settings2 size={18} />
        </button>
      </div>

      {nextRoutine && (
        <NextUpCard
          routine={nextRoutine}
          onQuickComplete={quickComplete}
          onStart={startFromRoutine}
          completing={completingId === nextRoutine.id}
        />
      )}

      <TrainingPlans templates={plainRoutines} workouts={workouts} onChanged={load} />

      {/* Schnellstart */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-fit-muted uppercase tracking-wide mb-3">Schnellstart</h2>
        <button
          onClick={quickStart}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-fit-accent text-white font-semibold text-sm hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} strokeWidth={3} />
          Leeres Workout starten (ohne Vorlage)
        </button>
      </section>

      <CalisthenicsSkillsSection
        routines={routines}
        loading={loading}
        onEdit={onEditRoutine}
        onStart={startFromRoutine}
        onRename={renameRoutine}
        onDelete={deleteRoutine}
        onQuickComplete={quickComplete}
        completingId={completingId}
      />

      {/* Routinen, nach Ordner (category) gruppiert — Strong-Vorbild */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-fit-muted uppercase tracking-wide">
            Meine Routinen {!loading && `(${plainRoutines.length})`}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={createFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-fit-muted hover:text-fit-ink hover:bg-fit-bg2 text-sm font-medium transition-colors"
            >
              <FolderPlus size={15} strokeWidth={2.4} /> Ordner
            </button>
            <button
              onClick={newRoutine}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-fit-accent hover:bg-fit-accent/10 text-sm font-medium transition-colors"
            >
              <Plus size={15} strokeWidth={2.7} /> Neue Routine
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-fit-muted text-sm">Lädt…</div>
        ) : plainRoutines.length === 0 && folderNames.length === 0 ? (
          <div className="text-center py-16 text-fit-muted">
            <Dumbbell size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Noch keine Routinen. Erstelle deine erste Vorlage.</p>
          </div>
        ) : (
          <>
            {folderNames.map((name) => (
              <RoutineFolder
                key={name}
                label={name}
                routines={folders[name]}
                defaultOpen
                onDeleteFolder={deleteEmptyFolder}
                onEdit={onEditRoutine} onStart={startFromRoutine} onRename={renameRoutine}
                onDelete={deleteRoutine} onQuickComplete={quickComplete} onSetCategory={setCategory}
                completingId={completingId}
              />
            ))}
            {uncategorized.length > 0 && (
              <RoutineFolder
                label="Ohne Ordner"
                routines={uncategorized}
                defaultOpen={folderNames.length === 0}
                onEdit={onEditRoutine} onStart={startFromRoutine} onRename={renameRoutine}
                onDelete={deleteRoutine} onQuickComplete={quickComplete} onSetCategory={setCategory}
                completingId={completingId}
              />
            )}
          </>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-xs font-semibold shadow-lg z-50 bg-fit-card text-fit-accent border border-fit-line animate-in slide-in-from-bottom-4 duration-300">
          {toast}
        </div>
      )}
    </div>
  );
}
