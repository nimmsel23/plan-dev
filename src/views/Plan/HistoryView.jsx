import { useEffect, useMemo, useState } from "react";
import { Clock, Dumbbell, Trophy, Trash2, X, History } from "lucide-react";
import { api } from "./api.js";
import {
  finishedWorkouts, workoutTotals, groupWorkoutSets, bestSet, formatSet,
  formatDuration, formatKg, workoutPRs,
} from "./lib/history.js";

function monthLabel(iso) {
  return new Date(iso).toLocaleDateString("de-AT", { month: "long", year: "numeric" });
}

function dayLabel(iso) {
  return new Date(iso).toLocaleDateString("de-AT", { weekday: "long", day: "2-digit", month: "long" });
}

// Strong-"Verlauf": abgeschlossene Workouts nach Monat, je Karte Dauer,
// Volumen, Rekorde und bester Satz pro Übung. Tippen öffnet alle Sätze.
export default function HistoryView({ onOpenExercise }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const d = await api.get("/workouts");
      setWorkouts(d.workouts || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const finished = useMemo(() => finishedWorkouts(workouts), [workouts]);
  const prsById = useMemo(() => {
    const map = {};
    for (const w of finished) map[w.id] = workoutPRs(w, finished);
    return map;
  }, [finished]);

  const months = [];
  for (const w of finished) {
    const label = monthLabel(w.finished_at);
    if (!months.length || months[months.length - 1].label !== label) months.push({ label, items: [] });
    months[months.length - 1].items.push(w);
  }

  async function remove(w) {
    if (!confirm(`"${w.name}" aus dem Verlauf löschen?`)) return;
    await api.delete(`/workouts/${w.id}`);
    setOpenId(null);
    load();
  }

  const open = finished.find((w) => w.id === openId);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Verlauf</h1>

      {loading ? (
        <div className="py-16 text-center text-sm text-fit-muted">Lädt…</div>
      ) : finished.length === 0 ? (
        <div className="py-16 text-center text-fit-muted">
          <History size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine abgeschlossenen Workouts.</p>
        </div>
      ) : months.map((m) => (
        <section key={m.label} className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-fit-muted">
            {m.label} · {m.items.length} Workouts
          </h2>
          <div className="flex flex-col gap-2">
            {m.items.map((w) => {
              const totals = workoutTotals(w);
              const prs = prsById[w.id] || [];
              const groups = groupWorkoutSets(w);
              return (
                <button
                  key={w.id}
                  onClick={() => setOpenId(w.id)}
                  className="w-full rounded-xl border border-fit-line bg-fit-card p-3 text-left transition-colors hover:border-fit-accent"
                >
                  <div className="text-sm font-semibold">{w.name}</div>
                  <div className="text-[11px] text-fit-muted">{dayLabel(w.finished_at)}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-fit-muted">
                    <span className="flex items-center gap-1"><Clock size={12} />{formatDuration(totals.durationMs)}</span>
                    <span className="flex items-center gap-1"><Dumbbell size={12} />{formatKg(totals.volume)} kg</span>
                    {prs.length > 0 && (
                      <span className="flex items-center gap-1 text-yellow-500"><Trophy size={12} />{prs.length} Rekord{prs.length > 1 ? "e" : ""}</span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-2 text-xs">
                    <span className="text-[10px] font-bold uppercase text-fit-muted">Übung</span>
                    <span className="text-[10px] font-bold uppercase text-fit-muted">Bester Satz</span>
                    {groups.map((g) => (
                      <div key={g.exercise_id || g.name} className="contents">
                        <span className="truncate">{g.sets.length} × {g.name}</span>
                        <span className="font-mono text-fit-muted">{formatSet(bestSet(g.sets))}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-fit-bg text-fit-ink">
          <header className="flex items-center gap-3 border-b border-fit-line px-4 py-3">
            <button onClick={() => setOpenId(null)} className="p-2 rounded-xl text-fit-muted hover:text-fit-ink hover:bg-fit-bg2" aria-label="Schließen">
              <X size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold tracking-tight">{open.name}</h2>
              <div className="text-[11px] text-fit-muted">{dayLabel(open.finished_at)} · {formatDuration(workoutTotals(open).durationMs)}</div>
            </div>
            <button onClick={() => remove(open)} className="p-2 rounded-xl text-fit-muted hover:text-fit-red hover:bg-red-500/10" title="Löschen">
              <Trash2 size={18} />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mx-auto max-w-2xl">
              {(prsById[open.id] || []).map((pr, i) => (
                <div key={i} className="mb-1.5 flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm">
                  <Trophy size={14} className="text-yellow-500" />
                  <span className="flex-1 truncate">{pr.name} · {pr.kind}</span>
                  <span className="font-mono font-semibold">{pr.value}</span>
                </div>
              ))}
              {groupWorkoutSets(open).map((g) => (
                <div key={g.exercise_id || g.name} className="mt-3 rounded-xl border border-fit-line bg-fit-card p-3">
                  <button
                    onClick={() => onOpenExercise?.(g.exercise_id || g.name)}
                    className="mb-2 text-sm font-semibold text-fit-accent hover:underline"
                  >
                    {g.name}
                  </button>
                  {g.sets.map((s, i) => (
                    <div key={s.setId || i} className="grid grid-cols-[1.5rem_1fr] text-sm">
                      <span className="font-mono text-xs text-fit-muted">{i + 1}</span>
                      <span className="font-mono">{formatSet(s)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
