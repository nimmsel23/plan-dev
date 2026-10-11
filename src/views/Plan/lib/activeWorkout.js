// Merkt sich das gerade laufende Workout (Strong: minimierte Leiste über
// der Tab-Bar, solange ein Workout offen ist). Nur ein Zeiger auf
// Firestore/Server-Daten — die Sätze selbst speichert WorkoutSession.
const KEY = "plan-active-workout";
export const ACTIVE_WORKOUT_EVENT = "plan:active-workout";

export function readActiveWorkout() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeActiveWorkout(value) {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    // privater Modus o.ä. — Leiste fehlt dann, Workout bleibt erhalten
  }
  window.dispatchEvent(new CustomEvent(ACTIVE_WORKOUT_EVENT, { detail: value }));
}
