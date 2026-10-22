# Plan — Architektur

Stand: 2026-10-16. Produktziel: `../../../INSPIRATION.md`.

## Einstieg und Zuständigkeiten

`src/plan-main.jsx` lässt angemeldete Nutzer in ihr persönliches Trainingslogbuch.
`StrongApp.jsx` besitzt Tab-/Unteransicht und den aktiven Workout-Zeiger.
`usePlanCoach` schaltet die Klientenverwaltung nach Custom Claim, eigener
`roles/{uid}`-Rolle oder der bestehenden Alpha-UID frei. Eine E-Mail-Heuristik
ist kein Berechtigungsnachweis. Firestore Rules bleiben in VitalOS.

`WorkoutList` lädt Vorlagen und Workouts. Die Oberfläche trennt Vorlagen von
Trainingsplänen, priorisiert eine laufende Einheit und bietet leeren Start und
neue Vorlage an. `RoutineFolder`/`RoutineCard` zeigen startbare Vorlagen.
Quick-Complete wird im neuen persönlichen Ablauf nicht angeboten.

## Übungskatalog und Atlas

`lib/catalog.js` liest die 873 Yuhonas-Einträge aus der bestehenden generierten
KB (`exerciseBulkData.generated.js`), normalisiert sie und bietet Filter an.
Es gibt keine zweite Importpipeline. Die bestehende KB-Suche kann zusätzliche
kuratierte Treffer liefern; Yuhonas-Quellreferenzen verhindern doppelte Treffer.
`ExercisesView` bietet Katalog und persönliche Übungshistorie getrennt an.
`ExerciseSearch` verwendet denselben Adapter im Vorlageneditor und Logger.
`CatalogDetail` zeigt Bildpaar, Anleitung und Link zur separaten VOS-Atlas-App.

Atlas selbst gehört zu `fitness-dev/frontend/src/views/Exercises` und liest
seine Geräte-Mirror über `frontend/src/lib/exerciseDbs`. Plan teilt Quell-IDs
und Darstellungskonventionen, aber keine originübergreifende IndexedDB.

## Coach und Klient

`CoachWorkspace` wählt einen Klienten aus den bestehenden Profilen aus.
`createPlanApi(clientUid)` reicht die UID an den existierenden lokalen
`?uid=`-Vertrag oder die Firestore-Routine-Adapter weiter. Neue lokale Aufrufe
verwenden relative `api/…`-Pfade. Node leitet `/api/*` ohne Pfadumschreibung
an Python weiter; die Router sind dort zusätzlich mit `/api` registriert.
Der lokale Python-Owner ist `~/fitness-dev`; die Router-Verträge wurden dorthin
übernommen. Bestehende direkte Routen bleiben für ältere Consumer erhalten. Derselbe
`RoutineBuilder` bearbeitet eigene und Klienten-Vorlagen einschließlich Sätzen,
Pausen, Reihenfolge und Hinweisen. Klienten-Vorlagen werden im Klientenpfad
angelegt und sind dort unmittelbar verfügbar.

`TrainingPlans`/`PlanCard` bündeln Vorlagen als Makrozyklus. Neue Coach-Pläne
beginnen als `draft`; explizites Bereitstellen erfordert mindestens eine Einheit
und Übungen in jeder Einheit. Der persönliche Planbereich blendet fremde
Coach-Entwürfe aus. Das ist eine UI-Unterscheidung, keine zusätzliche
Vertraulichkeitsgrenze gegenüber dem Eigentümer des Klientenpfads.
Bestehende Pläne ohne Status bleiben kompatibel sichtbar.

Beim Hinzufügen einer Vorlage speichert der Plan ihre Übungen als Snapshot.
Ein Start übergibt diesen Snapshot plus `sourcePlanId`, `sourcePlanRoutineId`
und ursprüngliche `routine_id` an den normalen Workout-Adapter. Änderungen an
Vorlagen beeinflussen diesen Snapshot nicht. Änderungen an einem bereits
bereitgestellten Plan sind direkt sichtbar; Versionierung veröffentlichter
Pläne ist noch nicht implementiert.

Ältere `wf_workouts`-Zuweisungen werden über `assignedWorkoutBody` in denselben
Logger überführt (`sourceAssignmentId`). Alte Checklisten-Completions werden
nicht nachträglich als gemessene Sätze übernommen. Coach-Ergebnisse stammen
im neuen Workspace aus den tatsächlichen Workout-Logs des gewählten Klienten.

## Auslieferung an Klienten (2026-10-22)

Makrozyklus-Felder: `description` (Coach-Hinweis, ≤ 2000 Zeichen), `status`
(`draft`/`published`, per PATCH in beide Richtungen), `publishedAt`. Plan-Einheiten
tragen zusätzlich `weekdays` (0 = Mo … 6 = So, vom Router normalisiert).
Beide Backends (`fitness/api/routers/macrocycles.py`, `lib/db/firestore/macrocycles.js`)
bieten `updateMacrocycle`.

- `CoachWorkspace`: Klienten-Übersicht (Pläne/Entwürfe, Workouts der letzten 7 Tage).
- `PlanCard`: Hinweis-Editor, Zurück-in-Entwurf, Wochentags-Chips, 7-Tage-Streifen,
  „Heute geplant“. Wochentage sind Orientierung, keine Sperre (`lib/weekSchedule.js`).
- `lib/copyPlan.js`: Plan als Entwurf zu anderem Klienten kopieren (Snapshots,
  Einheit für Einheit, nicht atomar – bei Abbruch bleibt ein unvollständiger Entwurf).
- `lib/newPlans.js` + Banner in `WorkoutList`: „Neu vom Coach“ je Gerät über
  `publishedAt` im localStorage.
- Push: `PushOptIn` nutzt `usePushNotifications` (Token in `fitness/{uid}/settings/push`);
  Cloud Function `onPlanPublished` (`functions/`, Entscheidung in `planPublished.js`)
  sendet bei neuem `publishedAt` eines fremden Coach-Plans. Test:
  `scripts/tests/functions-plan.test.mjs`.

## Speicherung und Wiederaufnahme

`lib/startWorkout` serialisiert Starts im aktuellen Browser-Kontext und setzt
beim Anlegen den benutzerbezogenen aktiven Workout-Zeiger. Definitiv gelöschte Workouts
(404/not-found) geben den Zeiger frei; Verbindungsfehler tun das nicht. Bestehende aktive
Einheiten werden fortgesetzt. `WorkoutList` findet verlorene Zeiger anhand
unabgeschlossener Server-Workouts wieder. Eine serverseitige Sperre gegen
parallele Starts auf mehreren Geräten gibt es noch nicht.

`WorkoutSession` hält lokale Satzänderungen. `lib/workoutDraft` schreibt sie
sofort benutzer-/workoutbezogen in localStorage und sendet Remote-Schreibvorgänge
seriell. Nur die Bestätigung der neuesten Revision löscht den Entwurf. Fehler
lassen ihn für Retry/Reload bestehen. Strukturelle Änderungen und Abschluss
warten auf ausstehende Schreibvorgänge. Firestore-Abschluss speichert Meta,
Event-Log und Übungsdokumente in einem gemeinsamen Batch.

Der lokale Entwurf sichert Satzänderungen, keine vollständig offline ausführbare
CRUD-App. Strukturänderungen, Starts und Abschlüsse brauchen einen erfolgreichen
Backend-Schreibvorgang. Mehrgeräte-Konfliktauflösung ist weiterhin offen.

`completedSetPatch` akzeptiert nur konkrete gültige Leistungswerte; Zielbereiche
wie „8–12“ werden nicht als absolvierte Wiederholungen gespeichert.
`workoutTemplateExercises` wandelt Ist-Werte ausdrücklich in Vorlagen-Ziele um.
Der Abschluss bietet neue Vorlage beziehungsweise explizites Aktualisieren der
Ursprungsvorlage an. Plan-Snapshots werden dadurch nicht still geändert.
`HistoryView` kann eine abgeschlossene Einheit aus ihrem Snapshot wiederholen.

## Prüfungen

- `node scripts/tests/plan.test.mjs`: Katalog, Zuweisungsadapter, Messwerte,
  fehlgeschlagene/überlappende Entwurfs-Schreibvorgänge und Vorlagen-Konvertierung.
- `node scripts/tests/plan-firestore.test.mjs`: reale Adapter mit isoliertem
  Firestore-Testdouble; Klientenpfad, Planbereitstellung, Snapshot und Batch-Fehler.
- `node scripts/tests/plan-proxy.test.mjs`: unveränderte `/api`-Pfade,
  PATCH-Body und Klienten-UID durch den generischen Node-Proxy.
- `python3 scripts/tests/test_plan_backend.py`: isolierte Python-Router-Integration.
- `npm run lint` und `npm run build:firebase:plan`.

Browser- und Cloud-Abnahme getrennt dokumentieren; Testdouble-Erfolg beweist
keinen authentifizierten Firebase-Durchlauf.

## Browserabnahme am 2026-10-16

Der wiederholbare Harness unter `scripts/tests/` verwendet reale Komponenten,
reale lokale Adapter und Python-Router mit temporären Daten und Testidentitäten.
Coach-Vorlage/Planbereitstellung, Start vom Plan, Satzlogging, Reload vor dem
Debounce, Abschluss, Wiederholung sowie Katalog/Details/Atlas-Link wurden im
Browser geprüft. Eine mobile Ansicht mit 390 px wurde ohne horizontalen
Überlauf geprüft. Das ersetzt keine authentifizierte Firebase-Abnahme.

Bedienanleitung: `../../../docs/PLAN-WORKFLOW.md`.
