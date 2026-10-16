import { useEffect, useMemo, useState } from "react";
import { Search, Dumbbell, ChevronRight } from "lucide-react";
import { api } from "./api.js";
import { buildExerciseHistory, exerciseIndex, formatSet } from "./lib/history.js";
import CatalogDetail from './components/CatalogDetail.jsx';
import { YUHONAS_EXERCISES, filterCatalog } from './lib/catalog.js';
import ExercisePhotoStrip from '../../components/ExercisePhotoStrip.jsx';
import { muskelDe } from '../../lib/kb/muscles.js';
import ExerciseDetail from "./components/ExerciseDetail.jsx";

// Strong-"Übungen": alle bisher trainierten Übungen (A–Z, filterbar), je
// mit Anzahl Workouts und letztem besten Satz. Tippen → Verlauf/Diagramme/
// Rekorde. `openKey` erlaubt anderen Tabs (Verlauf), direkt eine Übung
// zu öffnen.
export default function ExercisesView({ openKey, onOpenKeyChange }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('catalog');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [detail, setDetail] = useState(null);
  const [limit, setLimit] = useState(30);
  const [error, setError] = useState('');
  const catalog = useMemo(() => filterCatalog(YUHONAS_EXERCISES, { q: '', muscle: '', equipment: '' }), []);
  const muscles = [...new Set(catalog.flatMap((e) => e.primaryMuscles))].sort();
  const equipmentOptions = [...new Set(catalog.flatMap((e) => e.equipment))].sort();
  const [q, setQ] = useState("");
  const [localKey, setLocalKey] = useState(null);
  const selected = openKey !== undefined ? openKey : localKey;
  const setSelected = onOpenKeyChange || setLocalKey;

  useEffect(() => {
    api.get("/workouts")
      .then((d) => setWorkouts(d.workouts || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const history = useMemo(() => buildExerciseHistory(workouts), [workouts]);
  const index = useMemo(() => exerciseIndex(history), [history]);
  const needle = q.trim().toLowerCase();
  const filtered = needle ? index.filter((e) => e.name.toLowerCase().includes(needle)) : index;
  const catalogResults = useMemo(() => filterCatalog(catalog, { q, muscle, equipment }), [catalog, q, muscle, equipment]);
  useEffect(() => { setLimit(30); }, [q, muscle, equipment]);
  const selectedItem = index.find((e) => e.key === selected);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Übungen</h1>
      <p className="mb-4 text-sm text-fit-muted">Yuhonas-Übungskatalog mit Ausführung und Bewegungsbildern. Deine eigenen Leistungen findest du unter „Trainiert“.</p>
      <div className="mb-4 flex gap-2">{[['catalog', 'Katalog'], ['history', 'Trainiert']].map(([id, label]) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)} className={`rounded-xl px-4 py-2 text-sm ${mode === id ? 'bg-fit-accent text-fit-bg' : 'bg-fit-card text-fit-muted'}`}>{label}</button>)}</div>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fit-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Übung suchen…"
          className="w-full rounded-xl border border-fit-line bg-fit-bg2 py-2.5 pl-9 pr-3 text-sm text-fit-ink placeholder:text-fit-muted focus:border-fit-accent focus:outline-none"
        />
      </div>

      {mode === 'catalog' ? <>
        <div className="mb-4 grid grid-cols-2 gap-2"><select aria-label="Nach Muskel filtern" value={muscle} onChange={(e) => setMuscle(e.target.value)} className="min-w-0 rounded-xl border border-fit-line bg-fit-card p-2 text-sm"><option value="">Alle Muskeln</option>{muscles.map((m) => <option key={m} value={m}>{muskelDe(m)}</option>)}</select><select aria-label="Nach Equipment filtern" value={equipment} onChange={(e) => setEquipment(e.target.value)} className="min-w-0 rounded-xl border border-fit-line bg-fit-card p-2 text-sm"><option value="">Alles Equipment</option>{equipmentOptions.map((e) => <option key={e} value={e}>{e}</option>)}</select></div>
        <p className="mb-3 text-xs text-fit-muted">{catalogResults.length} Übungen · aus derselben Yuhonas-Quelle wie VOS Atlas</p>
        <div className="space-y-2">{catalogResults.slice(0, limit).map((ex) => <button key={ex.id} onClick={() => setDetail(ex)} className="flex w-full items-center gap-3 rounded-xl border border-fit-line bg-fit-card p-3 text-left"><ExercisePhotoStrip ex={ex} className="h-16 w-24 shrink-0" /><span className="min-w-0"><span className="block text-sm font-semibold">{ex.name}</span><span className="block text-xs text-fit-muted">{ex.equipment.join(', ')} · {ex.primaryMuscles.map(muskelDe).join(', ')}</span></span><ChevronRight size={15} className="ml-auto shrink-0" /></button>)}</div>
        {!catalogResults.length && <p className="py-8 text-center text-sm text-fit-muted">Keine Treffer. Filter ändern oder englischen Übungsnamen versuchen.</p>}
        {catalogResults.length > limit && <button onClick={() => setLimit(limit + 30)} className="mt-4 w-full rounded-xl border border-fit-line p-3 text-sm">Weitere Übungen laden</button>}
      </> : error ? <p role="alert" className="text-sm text-fit-red">{error}</p> : loading ? (
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

      {detail && <CatalogDetail exercise={detail} onClose={() => setDetail(null)} />}
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
