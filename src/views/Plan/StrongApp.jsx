import { useEffect, useState } from "react";
import { User, History, Plus, Dumbbell, Timer, ChevronUp } from "lucide-react";
import PlanView from "./index.jsx";
import HistoryView from "./HistoryView.jsx";
import ExercisesView from "./ExercisesView.jsx";
import ProfileView from "./ProfileView.jsx";
import { api } from "./api.js";
import { formatClock } from "./lib/history.js";
import { ACTIVE_WORKOUT_EVENT, readActiveWorkout, writeActiveWorkout } from "./lib/activeWorkout.js";

const TABS = [
  { id: "profile", label: "Profil", icon: User },
  { id: "history", label: "Verlauf", icon: History },
  { id: "workout", label: "Workout", icon: Plus },
  { id: "exercises", label: "Übungen", icon: Dumbbell },
];

// Strong-artige App-Hülle für den standalone Plan-Build (plan.html):
// Tab-Leiste unten (Profil · Verlauf · Workout · Übungen) und — solange ein
// Workout läuft und man woanders ist — eine Leiste darüber, die zurück ins
// laufende Workout führt. Der Workout-Tab ist der bestehende PlanView
// (Vorlagen, Trainingspläne, WorkoutSession), "controlled" geroutet, damit
// die Leiste direkt ins Workout springen kann.
export default function StrongApp({ user }) {
  const [tab, setTab] = useState("workout");
  const [planRoute, setPlanRoute] = useState({ view: null, id: null });
  const [active, setActive] = useState(readActiveWorkout);
  const [exerciseKey, setExerciseKey] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const onChange = (e) => setActive(e.detail ?? readActiveWorkout());
    window.addEventListener(ACTIVE_WORKOUT_EVENT, onChange);
    return () => window.removeEventListener(ACTIVE_WORKOUT_EVENT, onChange);
  }, []);

  // Zeiger kann veraltet sein (auf anderem Gerät beendet/gelöscht).
  useEffect(() => {
    const stored = readActiveWorkout();
    if (!stored?.id) return;
    api.get(`/workouts/${stored.id}`)
      .then((d) => { if (!d?.workout || d.workout.finished_at) writeActiveWorkout(null); })
      .catch(() => writeActiveWorkout(null));
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const tick = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [active]);

  function openActiveWorkout() {
    if (!active) return;
    setPlanRoute({ view: "workout", id: active.id });
    setTab("workout");
  }

  function selectTab(id) {
    if (id === tab && id === "workout") setPlanRoute({ view: null, id: null });
    setTab(id);
  }

  const inActiveWorkout = tab === "workout" && planRoute.view === "workout" && planRoute.id === active?.id;
  const showActiveBar = active && !inActiveWorkout;
  const startedMs = Date.parse(active?.started_at);

  return (
    <div className={showActiveBar ? "pb-[calc(9.5rem+env(safe-area-inset-bottom))]" : "pb-[calc(5.5rem+env(safe-area-inset-bottom))]"}>
      {tab === "profile" && <ProfileView user={user} />}
      {tab === "history" && (
        <HistoryView onOpenExercise={(key) => { setExerciseKey(key); setTab("exercises"); }} />
      )}
      {tab === "workout" && (
        <PlanView
          routeView={planRoute.view}
          routeId={planRoute.id}
          onRouteChange={(view, id) => setPlanRoute({ view, id })}
        />
      )}
      {tab === "exercises" && <ExercisesView openKey={exerciseKey} onOpenKeyChange={setExerciseKey} />}

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-fit-line bg-fit-bg/95 backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {showActiveBar && (
          <button
            onClick={openActiveWorkout}
            className="flex min-h-12 w-full items-center gap-3 border-b border-fit-line bg-fit-accent/10 px-4 py-2.5 text-left touch-manipulation"
          >
            <ChevronUp size={16} className="text-fit-accent" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{active.name || "Workout"}</div>
              <div className="text-[11px] text-fit-muted">Workout läuft — antippen zum Fortsetzen</div>
            </div>
            {Number.isFinite(startedMs) && (
              <span className="flex items-center gap-1 font-mono text-sm text-fit-accent">
                <Timer size={13} /> {formatClock(nowMs - startedMs)}
              </span>
            )}
          </button>
        )}
        <nav className="mx-auto grid max-w-2xl grid-cols-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => selectTab(id)}
              className={`flex flex-col items-center gap-0.5 min-h-[3.25rem] justify-center py-1.5 text-[11px] font-semibold transition-colors touch-manipulation ${tab === id ? "text-fit-accent" : "text-fit-muted hover:text-fit-ink"}`}
            >
              <Icon size={20} strokeWidth={tab === id ? 2.6 : 2} />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
