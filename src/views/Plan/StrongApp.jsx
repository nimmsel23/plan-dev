import { useEffect, useState } from "react";
import { Timer, ChevronUp } from "lucide-react";
import { startWorkout } from './lib/startWorkout.js';
import { workoutTemplateExercises } from './lib/workoutTemplate.js';
import CoachWorkspace from './CoachWorkspace.jsx';
import { usePlanCoach } from '../../hooks/usePlanCoach.js';
import { Users } from 'lucide-react';
import PlanView from "./index.jsx";
import HistoryView from "./HistoryView.jsx";
import ExercisesView from "./ExercisesView.jsx";
import ProfileView from "./ProfileView.jsx";
import { api } from "./api.js";
import { formatClock } from "./lib/history.js";
import { ACTIVE_WORKOUT_EVENT, readActiveWorkout, writeActiveWorkout, setActiveWorkoutOwner } from "./lib/activeWorkout.js";

import PlanSidebar from '../../shell/PlanSidebar.jsx';
import PlanHeader from '../../shell/PlanHeader.jsx';
import PlanTabBar from '../../shell/PlanTabBar.jsx';
import ThemeSheet from '../../shell/ThemeSheet.jsx';
import { NAV_ITEMS } from '../../shell/NavigationItems.js';
import { useSettingsStore } from '../../store/index.js';

// VitalOS shell; workout routing and active-session state stay owned here.
export default function StrongApp({ user, onSignOut }) {
  setActiveWorkoutOwner(user?.uid);
  const { sidebarPinned: pinned, setSidebarPinned } = useSettingsStore();
  const isCoach = usePlanCoach(user);
  const [coachOpen, setCoachOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [navExpanded, setNavExpanded] = useState(true);
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
      .then((d) => { if (!d?.workout || d.workout.finished_at) writeActiveWorkout(null, user?.uid || "local"); })
      .catch((err) => { if (err.status === 404 || err.code === "not-found") writeActiveWorkout(null, user?.uid || "local"); });
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const tick = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [active]);

  function openActiveWorkout() {
    if (!active) return;
    setPlanRoute({ view: "workout", id: active.id });
    setCoachOpen(false);
    setTab("workout");
  }

  function selectTab(id) {
    if (id === tab && id === "workout") setPlanRoute({ view: null, id: null });
    setCoachOpen(false);
    setTab(id);
  }

  const inActiveWorkout = !coachOpen && tab === "workout" && planRoute.view === "workout" && planRoute.id === active?.id;
  const showActiveBar = active && !inActiveWorkout;
  const startedMs = Date.parse(active?.started_at);

  return (
    <div style={{ '--mobile-nav-height': `calc(var(--nav-grip-h) + var(--safe-bottom)${navExpanded ? ' + var(--tabbar-h)' : ''})` }}>
      <PlanSidebar active={tab} onNavigate={selectTab} pinned={pinned} setPinned={setSidebarPinned} user={user} onTheme={() => setThemeOpen(true)} onRefresh={() => window.location.reload()} onSignOut={onSignOut} />
      <div className={`min-w-0 transition-all duration-500 ${pinned ? 'lg:ml-[304px]' : 'lg:ml-[108px]'}`}>
        <PlanHeader title={NAV_ITEMS.find((item) => item.id === tab)?.label} subtitle="Plan · VitalOS" />
        <div className="mx-auto max-w-[1600px] px-[var(--safe-left)]" style={{ paddingRight: 'var(--safe-right)', paddingBottom: 'calc(var(--mobile-nav-height) + 88px)' }}>
          {tab === 'workout' && isCoach && !coachOpen && <div className="mx-auto max-w-2xl px-4 pt-4"><button onClick={() => setCoachOpen(true)} className="flex items-center gap-2 rounded-xl border border-fit-line px-4 py-2 text-sm text-fit-accent"><Users size={16} /> Trainingspläne für Klienten</button></div>}
          {tab === 'workout' && coachOpen && isCoach && <CoachWorkspace onBack={() => setCoachOpen(false)} />}
          {tab === "profile" && <ProfileView user={user} />}
          {tab === "history" && (
            <HistoryView onRepeat={async (workout) => {
              let id;
              try { id = await startWorkout({ name: workout.name, routine_id: workout.routine_id, routine_snapshot: { name: workout.name, exercises: workoutTemplateExercises(workout) }, sourcePlanId: workout.sourcePlanId, sourcePlanRoutineId: workout.sourcePlanRoutineId, sourcePlanVersion: workout.sourcePlanVersion, sourceAssignmentId: workout.sourceAssignmentId }); }
              catch (err) { if (err.code !== 'ACTIVE_WORKOUT') throw err; if (!confirm(`„${err.active.name}“ läuft noch. Jetzt dorthin wechseln?`)) return; id = err.active.id; }
              setPlanRoute({ view: 'workout', id }); setCoachOpen(false); setTab('workout');
            }} onOpenExercise={(key) => { setExerciseKey(key); setTab("exercises"); }} />
          )}
          {tab === "workout" && !coachOpen && (
            <PlanView
              routeView={planRoute.view}
              routeId={planRoute.id}
              onRouteChange={(view, id) => setPlanRoute({ view, id })}
            />
          )}
          {tab === "exercises" && <ExercisesView openKey={exerciseKey} onOpenKeyChange={setExerciseKey} />}
        </div>
      </div>
      <div className={`fixed inset-x-0 z-50 ${pinned ? 'lg:left-[304px]' : 'lg:left-[108px]'}`} style={{ bottom: 'var(--plan-active-bottom, var(--mobile-nav-height))' }}>
        {showActiveBar && (
          <button
            onClick={openActiveWorkout}
            className="vos-bar vos-hairline-t flex w-full items-center gap-3 px-4 py-2.5 text-left"
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
      </div>
      <PlanTabBar active={tab} onNavigate={selectTab} expanded={navExpanded} onExpandedChange={setNavExpanded} user={user} onTheme={() => setThemeOpen(true)} onRefresh={() => window.location.reload()} onSignOut={onSignOut} />
      <ThemeSheet open={themeOpen} onClose={() => setThemeOpen(false)} />
    </div>
  );
}
