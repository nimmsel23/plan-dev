import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { api } from "./api.js";
import { finishedWorkouts, workoutsPerWeek, workoutTotals, formatKg, formatDuration } from "./lib/history.js";

// Strong-"Profil": Gesamtzahlen + "Workouts pro Woche"-Diagramm.
export default function ProfileView({ user }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/workouts")
      .then((d) => setWorkouts(d.workouts || []))
      .finally(() => setLoading(false));
  }, []);

  const finished = useMemo(() => finishedWorkouts(workouts), [workouts]);
  const perWeek = useMemo(() => workoutsPerWeek(workouts, 8), [workouts]);
  const totals = useMemo(() => finished.reduce((acc, w) => {
    const t = workoutTotals(w);
    acc.volume += t.volume;
    acc.durationMs += t.durationMs;
    return acc;
  }, { volume: 0, durationMs: 0 }), [finished]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
      {user?.email && <p className="mb-6 text-sm text-fit-muted">{user.email}</p>}

      {loading ? (
        <div className="py-16 text-center text-sm text-fit-muted">Lädt…</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-2">
            <Stat label="Workouts" value={finished.length} />
            <Stat label="Volumen" value={`${formatKg(Math.round(totals.volume))} kg`} />
            <Stat label="Trainingszeit" value={formatDuration(totals.durationMs)} />
          </div>

          <section className="rounded-xl border border-fit-line bg-fit-card p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-fit-muted">Workouts pro Woche</div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perWeek} margin={{ top: 6, right: 8, bottom: 0, left: -24 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--dim, #888)" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--dim, #888)" }} />
                  <Tooltip
                    cursor={{ fill: "var(--bg2, #222)" }}
                    contentStyle={{ background: "var(--card, #111)", border: "1px solid var(--line, #333)", fontSize: 12 }}
                    formatter={(v) => [v, "Workouts"]}
                    labelFormatter={(l) => `Woche ab ${l}`}
                  />
                  <Bar dataKey="count" fill="var(--accent, #3b82f6)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-fit-line bg-fit-card p-3 text-center">
      <div className="text-base font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-fit-muted">{label}</div>
    </div>
  );
}
