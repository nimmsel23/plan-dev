import { Trophy, Clock, Dumbbell, Layers } from "lucide-react";
import { formatDuration, formatKg, formatSet, groupWorkoutSets, bestSet, workoutTotals } from "../lib/history.js";

// Strong-Abschluss-Screen nach "Fertig": Dauer, Volumen, Sätze, neue
// persönliche Rekorde und bester Satz pro Übung.
export default function WorkoutSummary({ workout, prs = [], onDone }) {
  const totals = workoutTotals(workout);
  const groups = groupWorkoutSets(workout);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-500">
          <Trophy size={28} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Gut gemacht!</h1>
        <p className="mt-1 text-sm text-fit-muted">{workout.name}</p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2">
        <Stat icon={<Clock size={16} />} label="Dauer" value={formatDuration(totals.durationMs)} />
        <Stat icon={<Dumbbell size={16} />} label="Volumen" value={`${formatKg(totals.volume)} kg`} />
        <Stat icon={<Layers size={16} />} label="Sätze" value={totals.sets} />
      </div>

      {prs.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-fit-muted">Neue Rekorde ({prs.length})</h2>
          <div className="flex flex-col gap-1.5">
            {prs.map((pr, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm">
                <Trophy size={14} className="shrink-0 text-yellow-500" />
                <span className="flex-1 truncate">{pr.name} · {pr.kind}</span>
                <span className="font-mono font-semibold">{pr.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8 rounded-xl border border-fit-line bg-fit-card p-3">
        <div className="mb-2 grid grid-cols-[1fr_auto] text-[10px] font-bold uppercase tracking-wide text-fit-muted">
          <span>Übung</span><span>Bester Satz</span>
        </div>
        {groups.length === 0 && <p className="text-sm text-fit-muted">Keine Sätze abgehakt.</p>}
        {groups.map((g) => (
          <div key={g.exercise_id || g.name} className="grid grid-cols-[1fr_auto] gap-2 py-1 text-sm">
            <span className="truncate">{g.sets.length} × {g.name}</span>
            <span className="font-mono text-fit-muted">{formatSet(bestSet(g.sets))}</span>
          </div>
        ))}
      </section>

      <button
        onClick={onDone}
        className="w-full rounded-2xl bg-fit-accent py-3.5 text-sm font-semibold text-fit-bg transition-opacity hover:opacity-90"
      >
        Fertig
      </button>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-fit-line bg-fit-card p-3 text-center">
      <div className="mb-1 flex justify-center text-fit-muted">{icon}</div>
      <div className="text-base font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-fit-muted">{label}</div>
    </div>
  );
}
