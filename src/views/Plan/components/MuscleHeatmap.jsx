import { useState } from "react";
import { BarChart2, User } from "lucide-react";
import { muskelDe, muskelColor } from "../../../lib/kb/muscles.js";
import BodyMap from "./BodyMap.jsx";

function parseReps(reps) {
  if (!reps) return 10;
  const s = String(reps).trim().toLowerCase();
  if (s === "amrap" || s === "failure") return 12;
  const range = s.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const n = Number(s);
  return isNaN(n) ? 10 : n;
}

function buildHeatmap(exercises) {
  const map = {};
  for (const ex of exercises) {
    const reps = parseReps(ex.reps);
    const sets = ex.sets ?? 3;
    const vol  = sets * reps;
    for (const m of ex.primaryMuscles ?? []) {
      map[m] = (map[m] ?? 0) + vol;
    }
    for (const m of ex.secondaryMuscles ?? []) {
      map[m] = (map[m] ?? 0) + vol * 0.4;
    }
  }
  return map;
}

export default function MuscleHeatmap({ exercises }) {
  const [view, setView] = useState("body"); // "body" | "bars"

  if (!exercises?.length) return null;

  const heat   = buildHeatmap(exercises);
  const total  = Math.max(Object.values(heat).reduce((s, v) => s + v, 0), 1);
  const sorted = Object.entries(heat).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-2xl bg-fit-bg2 border border-fit-line p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold uppercase tracking-widest text-fit-muted">
          Muskel-Verteilung
        </div>
        <div className="flex gap-1 bg-fit-card rounded-lg p-0.5">
          <button
            onClick={() => setView("body")}
            aria-pressed={view === "body"}
            className={`p-1.5 rounded-md transition-colors ${view === "body" ? "bg-fit-bg2 text-fit-accent" : "text-fit-muted hover:text-fit-ink"}`}
            title="Körperansicht"
          >
            <User size={13} />
          </button>
          <button
            onClick={() => setView("bars")}
            aria-pressed={view === "bars"}
            className={`p-1.5 rounded-md transition-colors ${view === "bars" ? "bg-fit-bg2 text-fit-accent" : "text-fit-muted hover:text-fit-ink"}`}
            title="Balkendiagramm"
          >
            <BarChart2 size={13} />
          </button>
        </div>
      </div>

      {view === "body" && (
        <BodyMap exercises={exercises} />
      )}

      {view === "bars" && (
        <div className="flex flex-col gap-2">
          {sorted.map(([muscle, val]) => {
            const pct   = Math.round((val / total) * 100);
            const color = muskelColor(muscle);
            return (
              <div key={muscle} className="flex items-center gap-2">
                <div className="w-28 text-xs text-right text-fit-muted flex-shrink-0">{muskelDe(muscle)}</div>
                <div className="flex-1 h-2 rounded-full bg-fit-card overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                <div className="w-8 text-xs font-mono text-fit-muted text-right">{pct}%</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
