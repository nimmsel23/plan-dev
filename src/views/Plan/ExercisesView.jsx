import { useEffect, useMemo, useState } from "react";
import { Search, Dumbbell, ChevronRight } from "lucide-react";
import { api } from "./api.js";
import { buildExerciseHistory, exerciseIndex, formatSet } from "./lib/history.js";
import ExerciseDetail from "./components/ExerciseDetail.jsx";

// Strong-"Übungen": alle bisher trainierten Übungen (A–Z, filterbar), je
// mit Anzahl Workouts und letztem besten Satz. Tippen → Verlauf/Diagramme/
// Rekorde. `openKey` erlaubt anderen Tabs (Verlauf), direkt eine Übung
// zu öffnen.
export default function ExercisesView({ openKey, onOpenKeyChange }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [localKey, setLocalKey] = useState(null);
  const selected = openKey !== undefined ? openKey : localKey;
  const setSelected = onOpenKeyChange || setLocalKey;

  useEffect(() => {
    api.get("/workouts")
      .then((d) => setWorkouts(d.workouts || []))
      .finally(() => setLoading(false));
  }, []);

  const history = useMemo(() => buildExerciseHistory(workouts), [workouts]);
  const index = useMemo(() => exerciseIndex(history), [history]);
  const needle = q.trim().toLowerCase();
  const filtered = needle ? index.filter((e) => e.name.toLowerCase().includes(needle)) : index;
  const selectedItem = index.find((e) => e.key === selected);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Übungen</h1>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fit-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Übung suchen…"
          className="w-full rounded-xl border border-fit-line bg-fit-bg2 py-2.5 pl-9 pr-3 text-sm text-fit-ink placeholder:text-fit-muted focus:border-fit-accent focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-fit-muted">Lädt…</div>
      ) : index.length === 0 ? (
        <div className="py-16 text-center text-fit-muted">
          <Dumbbell size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sobald du ein Workout abschließt, erscheinen deine Übungen hier.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-fit-line bg-fit-card">
          {filtered.map((e) => (
            <button
              key={e.key}
              onClick={() => setSelected(e.key)}
              className="flex w-full items-center gap-3 border-b border-fit-line px-3 py-3 text-left last:border-b-0 hover:bg-fit-bg2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{e.name}</div>
                <div className="text-[11px] text-fit-muted">
                  {e.count} × · zuletzt {new Date(e.lastDate).toLocaleDateString("de-AT")} · {formatSet(e.lastBest)}
                </div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-fit-muted" />
            </button>
          ))}
          {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-fit-muted">Keine Treffer.</p>}
        </div>
      )}

      {selected && (
        <ExerciseDetail
          name={selectedItem?.name || selected}
          entries={history.get(selected) || []}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
