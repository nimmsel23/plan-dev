// Merkt sich das gerade laufende Workout (Strong: minimierte Leiste über
// der Tab-Bar, solange ein Workout offen ist). Nur ein Zeiger auf
// Firestore/Server-Daten — die Sätze selbst speichert WorkoutSession.
let owner = "local";
export function setActiveWorkoutOwner(uid) { owner = uid || "local"; }
const keyFor = (uid) => `plan-active-workout:${uid}`;
export const ACTIVE_WORKOUT_EVENT = "plan:active-workout";

export function readActiveWorkout(uid = owner) {
  try {
    const raw = localStorage.getItem(keyFor(uid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeActiveWorkout(value, uid = owner) {
  try {
    if (value) localStorage.setItem(keyFor(uid), JSON.stringify(value));
    else localStorage.removeItem(keyFor(uid));
  } catch {
    // privater Modus o.ä. — Leiste fehlt dann, Workout bleibt erhalten
  }
  if (uid !== owner) return;
  window.dispatchEvent(new CustomEvent(ACTIVE_WORKOUT_EVENT, { detail: value }));
}
