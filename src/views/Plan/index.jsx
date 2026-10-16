import { useState } from 'react'
import WorkoutList from './WorkoutList.jsx'
import RoutineBuilder from './RoutineBuilder.jsx'
import WorkoutSession from './WorkoutSession.jsx'
import AssignedPlans from './AssignedPlans.jsx'

// Route (welche Unteransicht + welches Template/Workout) ist optional von
// App.jsx aus steuerbar (URL-Hash, #session/plan?view=routine&id=...) —
// damit ein Link direkt zu einem Template/Workout führt statt immer auf
// die Liste. Ohne routeView/onRouteChange-Props (z.B. falls PlanView mal
// woanders eingebunden wird) fällt die Komponente auf internen State
// zurück, bleibt also weiter eigenständig nutzbar.
export default function PlanView({ routeView, routeId, onRouteChange }) {
  const [localRoute, setLocalRoute] = useState({ view: 'list' })
  const controlled = typeof onRouteChange === 'function'

  const route = controlled
    ? { view: routeView || 'list', routineId: routeView === 'routine' ? routeId : undefined, workoutId: routeView === 'workout' ? routeId : undefined }
    : localRoute

  function setRoute(next) {
    if (controlled) {
      onRouteChange(next.view === 'list' ? null : next.view, next.routineId || next.workoutId || null)
    } else {
      setLocalRoute(next)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {route.view === 'list' && (
        <>
          <WorkoutList
            onEditRoutine={(id) => setRoute({ view: 'routine', routineId: id })}
            onOpenWorkout={(id) => setRoute({ view: 'workout', workoutId: id })}
          />
        </>
      )}
      {route.view === 'routine' && (
        <RoutineBuilder
          routineId={route.routineId}
          onBack={() => setRoute({ view: 'list' })}
        />
      )}
      {route.view === 'workout' && (
        <WorkoutSession
          workoutId={route.workoutId}
          onBack={() => setRoute({ view: 'list' })}
          onFinished={() => setRoute({ view: 'list' })}
        />
      )}
    </div>
  )
}
