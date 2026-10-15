import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api } from "../api.js";

export default function NextUpCard({ routine, onQuickComplete, onStart, completing }) {
  const [exercises, setExercises] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get(`/routines/${routine.id}`).then((d) => {
      if (alive) setExercises(d.routine?.exercises || []);
    });
    return () => { alive = false; };
  }, [routine.id]);

  return (
    <section className="mb-8">
      <h2 className="text-sm font-bold text-fit-muted uppercase tracking-wide mb-3">Heute dran</h2>
      <div className="rounded-2xl bg-fit-accent/10 border border-fit-accent/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-fit-accent/20">
          <div className="text-lg font-bold text-fit-ink">{routine.name}</div>
          {routine.goal && <p className="text-xs text-fit-dim mt-0.5">{routine.goal}</p>}
        </div>

        {exercises === null ? (
          <div className="px-4 py-4 text-xs text-fit-muted text-center">Lädt…</div>
        ) : exercises.length === 0 ? (
          <div className="px-4 py-4 text-xs text-fit-muted text-center">Keine Übungen hinterlegt</div>
        ) : (
          <div className="divide-y divide-fit-line/20">
            {exercises.map((ex) => (
              <div key={ex.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-fit-ink truncate">{ex.name}</span>
                <span className="text-xs font-mono text-fit-dim shrink-0">{ex.target_sets ?? 3}×{ex.target_reps ?? "8-12"}</span>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 flex gap-2">
          <button
            onClick={() => onQuickComplete(routine)}
            disabled={completing}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-fit-accent text-fit-bg text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-50"
          >
            <Check size={16} strokeWidth={2.7} /> {completing ? 'Speichert…' : `${routine.name} erledigt`}
          </button>
          <button
            onClick={() => onStart(routine.id)}
            className="px-4 py-3 rounded-xl bg-fit-card text-fit-ink text-sm font-medium hover:bg-fit-bg2 transition-colors"
          >
            Frei loggen
          </button>
        </div>
      </div>
    </section>
  );
}
