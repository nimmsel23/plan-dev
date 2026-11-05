/**
 * Session — Thin sub-tab router.
 *
 * All state lives in useSession hook.
 * Routes between: editor (today) / history / plan.
 * index.jsx went from 860 lines → ~60 lines. 
 */

import { useState } from 'react';
import { localToday } from '@utils';
import { useSession } from './useSession';
import SessionEditor from './SessionEditor';
import SessionHistory from './SessionHistory';
import PlanView from '../Plan/index.jsx';
import WorkoutTimerCard from './WorkoutTimerCard.jsx';
import SixPackPromiseCard from '../../../6pack/SixPackPromiseCard.jsx';
import { getAllCoachingNotes } from '../../lib/coachNotes';
import SkillsCard from '../../../Skills/SkillsCard.jsx';
import TodayPlan, { useTodayPlan } from './TodayPlan.jsx';

export default function Session({
  initialDate, initialDraft, onInspectExercise, onOpenSession,
  recentDays = 7, coverageThreshold = 1.0, subTab, onDateChange, onSubNav,
  planView, planId, onPlanRouteChange,
  gateAutoOpenFlag, onGateAutoOpenConsumed,
}) {
  const session = useSession({ initialDate, initialDraft, recentDays, coverageThreshold, onDateChange });
  const { loading: planLoading, cycle, nextRoutine, lastPerformance, clientUid, reload } = useTodayPlan();
  const [logFreely, setLogFreely] = useState(false);

  // BUGFIX 2026-09-05 (Klient Matthias — "stuck in Oktober 2025"): isTodayTab
  // prüfte bisher NUR subTab, nicht das tatsächliche Datum. `!subTab` ist aber
  // auch bei einem expliziten Datums-Deep-Link true (parseHashRoute() setzt
  // subTab dort nie), UND jeder Datumswechsel remountet den ganzen <Session>-
  // Baum (App.jsx: key={sessionDate}), was das lokale `logFreely` zurücksetzt.
  // Ergebnis: sobald ein Klient mit aktivem Coach-Plan (cycle+nextRoutine) den
  // Date-Picker benutzt, springt die App bei JEDEM Datumswechsel zurück auf
  // diesen TodayPlan-Screen (der selbst komplett datums-blind ist, kein
  // Date-Picker, keine SessionHeader) — Endlosschleife, kein Weg zurück zum
  // Editor für ein beliebiges Datum. Fix: Gate nur, wenn tatsächlich HEUTE
  // aktiv ist — TodayPlan ist ohnehin ein reiner "heute"-Habit-Screen, für
  // jedes andere Datum ist der normale Editor korrekt.
  const isTodayTab = (subTab === 'today' || !subTab) && session.date === localToday();
  if (isTodayTab && !planLoading && cycle && nextRoutine && !logFreely && !initialDraft) {
    return (
      <TodayPlan
        cycle={cycle}
        nextRoutine={nextRoutine}
        lastPerformance={lastPerformance}
        clientUid={clientUid}
        onDone={reload}
        onLogFreely={() => setLogFreely(true)}
        onLoadDraft={(draft) => onOpenSession?.(localToday(), draft)}
      />
    );
  }

  if (subTab === 'timer') {
    return <SixPackPromiseCard onSubNav={onSubNav} coachingNotes={getAllCoachingNotes()} />;
  }

  if (subTab === 'skills') {
    return (
      <div
        className="px-2 mt-3 space-y-4"
        style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}
      >
        <SkillsCard />
        <WorkoutTimerCard />
      </div>
    );
  }

  if (subTab === 'plan') {
    return <PlanView routeView={planView} routeId={planId} onRouteChange={onPlanRouteChange} />;
  }

  if (subTab === 'history') {
    return (
      <SessionHistory
        recentSessions={session.recentSessions}
        onOpenSession={onOpenSession}
        setDate={session.setDate}
        reDateEntry={session.reDateEntry}
        setReDateEntry={session.setReDateEntry}
        draggedDate={session.draggedDate}
        setDraggedDate={session.setDraggedDate}
        dragOverDate={session.dragOverDate}
        setDragOverDate={session.setDragOverDate}
        moveSessionToDate={session.moveSessionToDate}
        deleteSessionAtDate={session.deleteSessionAtDate}
        hasMoreHistory={session.hasMoreHistory}
        onLoadMoreHistory={session.loadMoreHistory}
      />
    );
  }

  // Default: today / session editor
  return (
      <SessionEditor
        {...session}
        onInspectExercise={onInspectExercise}
        currentSubTab={subTab}
        onSubNav={onSubNav}
        gateAutoOpenFlag={gateAutoOpenFlag}
        onGateAutoOpenConsumed={onGateAutoOpenConsumed}
      />
  );
}
