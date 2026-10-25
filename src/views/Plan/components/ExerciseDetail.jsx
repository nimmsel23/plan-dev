import { useMemo, useState } from "react";
import { X, Trophy } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  exerciseRecords, exerciseSeries, formatSet, formatKg, bestSet, estimate1RM,
} from "../lib/history.js";

const TABS = [
  { id: "history", label: "Verlauf" },
  { id: "charts", label: "Diagramme" },
  { id: "records", label: "Rekorde" },
];

const CHARTS = [
  { key: "best1RM", label: "Geschätztes 1RM (kg)" },
  { key: "maxWeight", label: "Schwerstes Gewicht (kg)" },
  { key: "volume", label: "Volumen pro Workout (kg)" },
  { key: "maxReps", label: "Meiste Wiederholungen" },
];

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("de-AT", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}

// Strong-Übungsdetail: Verlauf / Diagramme / Rekorde einer Übung, gespeist
// aus `entries` = buildExerciseHistory(...).get(key) (neueste zuerst).
// Wird als Vollbild-Sheet gerendert — aus dem laufenden Workout heraus
// genauso wie aus dem Übungen-Tab.
export default function ExerciseDetail({ name, entries = [], onClose }) {
  const [tab, setTab] = useState("history");
  const records = useMemo(() => exerciseRecords(entries), [entries]);
  const series = useMemo(() => exerciseSeries(entries), [entries]);
  const isWeighted = entries.some((e) => e.metricType === "weight_reps");
  const charts = isWeighted ? CHARTS : CHARTS.filter((c) => c.key === "maxReps");

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-fit-bg text-fit-ink">
      <header className="flex items-center gap-3 border-b border-fit-line px-4 py-3">
        <button onClick={onClose} className="p-2 rounded-xl text-fit-muted hover:text-fit-ink hover:bg-fit-bg2" aria-label="Schließen">
          <X size={20} />
        </button>
        <h2 className="flex-1 truncate text-lg font-bold tracking-tight">{name}</h2>
      </header>
      <nav className="flex gap-1 border-b border-fit-line px-4 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${tab === t.id ? "bg-fit-accent text-fit-bg" : "text-fit-muted hover:bg-fit-bg2"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl">
          {entries.length === 0 && (
            <p className="py-16 text-center text-sm text-fit-muted">
              Noch keine abgeschlossenen Workouts mit dieser Übung.
            </p>
          )}

          {tab === "history" && entries.map((e) => (
            <div key={`${e.workoutId}-${e.date}`} className="mb-3 rounded-xl border border-fit-line bg-fit-card p-3">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <div className="truncate text-sm font-semibold">{e.workoutName || "Workout"}</div>
                <div className="shrink-0 text-[11px] text-fit-muted">{fmtDate(e.date)}</div>
              </div>
              <div className="grid grid-cols-[1.5rem_1fr_auto] gap-x-2 gap-y-1 text-sm">
                {e.sets.map((s, i) => (
                  <div key={s.setId || i} className="contents">
                    <span className="font-mono text-xs text-fit-muted">{i + 1}</span>
                    <span className="font-mono">{formatSet(s)}</span>
                    <span className="font-mono text-xs text-fit-muted">
                      {estimate1RM(s.weight, s.reps) > 0 ? `1RM ${formatKg(estimate1RM(s.weight, s.reps))}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {tab === "charts" && entries.length > 0 && charts.map((c) => (
            <div key={c.key} className="mb-4 rounded-xl border border-fit-line bg-fit-card p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-fit-muted">{c.label}</div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--line, #333)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--dim, #888)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--dim, #888)" }} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ background: "var(--card, #111)", border: "1px solid var(--line, #333)", fontSize: 12 }} />
                    <Line type="monotone" dataKey={c.key} stroke="var(--accent, #3b82f6)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}

          {tab === "records" && entries.length > 0 && (
            <div className="flex flex-col gap-2">
              <RecordRow label="Geschätztes 1RM" rec={records.best1RM} value={(r) => `${formatKg(r.value)} kg`} detail={(r) => formatSet(r.set)} />
              <RecordRow label="Schwerstes Gewicht" rec={records.maxWeight} value={(r) => `${formatKg(r.value)} kg`} detail={(r) => formatSet(r.set)} />
              <RecordRow label="Meiste Wiederholungen" rec={records.maxReps} value={(r) => `${r.value} Wdh`} detail={(r) => formatSet(r.set)} />
              <RecordRow label="Bestes Satzvolumen" rec={records.maxVolumeSet} value={(r) => `${formatKg(r.value)} kg`} detail={(r) => formatSet(r.set)} />
              <RecordRow label="Bestes Workout-Volumen" rec={records.maxVolumeSession} value={(r) => `${formatKg(r.value)} kg`} />
              <div className="mt-2 rounded-xl border border-fit-line bg-fit-card p-3 text-sm">
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-fit-muted">Gesamt</div>
                {entries.length} Workouts · letzter bester Satz: {formatSet(bestSet(entries[0].sets))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordRow({ label, rec, value, detail }) {
  if (!rec) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-fit-line bg-fit-card p-3">
      <Trophy size={18} className="shrink-0 text-yellow-500" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-fit-muted">{label}</div>
        <div className="text-base font-bold">{value(rec)}</div>
      </div>
      <div className="shrink-0 text-right text-[11px] text-fit-muted">
        {detail && <div className="font-mono">{detail(rec)}</div>}
        <div>{fmtDate(rec.date)}</div>
      </div>
    </div>
  );
}
