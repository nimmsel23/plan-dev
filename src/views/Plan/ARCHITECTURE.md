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
bereitgestellten Plan sind direkt sichtbar; Versionierung: siehe unten.

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
  in einem Schreibvorgang (atomar)).
- `lib/newPlans.js` + Banner in `WorkoutList`: „Neu vom Coach“ je Gerät über
  `publishedAt` im localStorage.
- Push: `PushOptIn` nutzt `usePushNotifications` (Token in `fitness/{uid}/settings/push`);
  Cloud Function `onPlanPublished` (`functions/`, Entscheidung in `planPublished.js`)
  sendet bei neuem `publishedAt` eines fremden Coach-Plans. Test:
  `scripts/tests/functions-plan.test.mjs`.

## Versionierung veröffentlichter Pläne (2026-10-22)

Git-Modell: der Plan (`macrocycles/{id}`) ist der **Arbeitsstand**, jede Veröffentlichung
ein unveränderlicher **Commit** `macrocycles/{id}/versions/vN` (`number`, `message`, `author`,
`createdAt`, `parent`, `snapshot` = Name/Hinweis/Wochen/Einheiten samt Übungen). Am Plan liegen
`published` (Snapshot des Head), `headVersion`, `headMessage`, `publishedAt`.
Klienten lesen ausschließlich `published` (`lib/planVersions.js::clientView`); Coach-Änderungen
am Arbeitsstand sind für sie unsichtbar, bis erneut veröffentlicht wird. Veröffentlichen ohne
inhaltliche Änderung wird abgelehnt; Zurückziehen/erneut Bereitstellen ohne Änderung legt keine
neue Version an. `restore` setzt den Arbeitsstand auf eine Version (checkout), die Historie
bleibt; ein Revert ist also restore + neu veröffentlichen. `diffSnapshots` liefert die lesbare
Änderungsliste (neue/entfernte Einheiten und Übungen, Sätze, Tage, Ziele, Hinweis). Workouts tragen
`sourcePlanVersion`. UI: `components/PlanVersions.jsx`. Beide Backends
(`macrocycles.py`, `firestore/macrocycles.js`) bieten `publish`/`listPlanVersions`/`restorePlanVersion`.
Bestehende, schon bereitgestellte Pläne ohne Version zeigen dem Coach „Live ohne Version“ (Klienten sehen
ohne `published` keinen Arbeitsstand mehr) bis zur ersten Veröffentlichung als v1. Neue Pläne starten als `draft`.

Konsistenz (2026-10-23): Firestore-Schreibpfade laufen über `runTransaction` und schreiben nur geänderte Felder;
Publish vergibt die Nummer in der Transaktion und legt `versions/vN` nur an, wenn sie fehlt (parallele Publishes
kollidieren nicht). Lokal sichert ein Lock alle Lesen-Ändern-Schreiben-Pfade. `copyPlan` legt den Zielplan in
einem Schreibvorgang an (Entwurf, neue IDs, `sourceTemplateId` null, Warnung bei unveröffentlichten Änderungen).
Die Listenantwort enthält kein `published`, `routineCount` zählt den veröffentlichten Stand. Push nennt Version
und Nachricht (`planUpdated`), feuert nur bei neuerem `publishedAt`.

„Erledigt“ ist eine Regel (`lib/planProgress.js`, lokale Zeit): primär über `sourcePlanRoutineId`, sonst über
die Herkunfts-Vorlage; gilt für „heute offen“, Zeitraumziele und die Empfehlung (`habitProgress`, `weekSchedule`).
Ein Start, der von einem laufenden Workout abweicht, fragt nach (`startTarget.js`, `ACTIVE_WORKOUT`).

Rules: Owner-Schreibrechte auf `macrocycles/**` erlauben Klienten, `published`/`versions` ihrer Coach-Pläne zu fälschen.
Gehärtete Fassung (Emulator-getestet, `npm run test:rules`): `docs/firestore-rules-plan.patch`, anzuwenden auf
`~/vitalos/firestore.rules` und von dort zu deployen. Nicht gehärtet: Klienten können unveröffentlichte Entwürfe lesen.
Vertrag `@db`: `scripts/tests/db-barrel-contract.test.mjs` prüft alle Importe gegen die Barrels von plan-dev und fitness-dev.

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

## Meine Woche und Rückmeldung (Klient → Coach)

- `lib/weekOverview.js` + `components/WeekOverview.jsx`: Wochenübersicht (Mo–So, lokale Zeit) unter der Startkarte, nur bei Plänen mit Wochentagen. Status je Einheit nach dem Fälligkeitsfenster (siehe unten): erledigt / ab jetzt möglich / heute fällig / offen (überfällig) / geplant.
- `lib/workoutFeedback.js`: nach dem Training optional Anstrengung (1–10) und Notiz → `workout.feedback = {effort, note, at}` (normalisiert, Notiz max. 1000 Zeichen). Der Coach sieht sie unter „Absolvierte Workouts“ im Coach-Workspace.
- Tests: `scripts/tests/plan-week.test.mjs`.
- „Was ist neu?“ (`lib/planUpdates.js`, `components/WhatsNew.jsx`): je Coach-Plan merkt sich das Gerät die zuletzt gesehene Version (`plan-seen-versions:<uid>`, nur lokal). Ist `headVersion` neuer, erscheint auf der Startseite ein Banner mit Commit-Nachricht und Änderungsliste (`diffSnapshots` zwischen gesehener und aktueller Version aus `versions/`). Ohne Eintrag wird still der Ausgangsstand gesetzt; neue Pläne meldet weiter „Neu vom Coach“. Keine Lesebestätigung an den Coach (Rules lassen Klienten nichts an Coach-Plänen schreiben).
- Lesebestätigung: Mit „Verstanden“/„Zum Plan“ (und beim Öffnen eines neuen Plans) legt der Klient `fitness/{uid}/macrocycles/{id}/receipts/vN` an (`markPlanRead`, `{planId, version, readAt}`, je Version einmalig, unveränderlich). Der Coach sieht in `PlanVersions` „✓ Klient hat Version N gelesen“ bzw. „noch nicht gelesen“ und im Verlauf je Version. Rules: `receipts` in `firestore.rules.part` (create-only, Feldliste, Doc-ID = `v<version>`); lokal `GET/POST …/receipts`. Wirkt erst nach Einbetten in `~/vitalos` + Rules-Deploy; vorher schlägt das Schreiben still fehl (Coach sieht „noch nicht gelesen“).

## Fälligkeitsfenster (±24 h)

Eine geplante Einheit (Plan-Einheit + Wochentag) ist ein *Vorkommen* mit Fenster über drei lokale Kalendertage (`lib/occurrences.js`):

| Tag | Status | Bedeutung |
|---|---|---|
| Vortag (z. B. So für Mo) | `scheduled` | ab jetzt möglich |
| Plantag | `due` | heute fällig |
| ab Folgetag | `overdue` | offen, bis es gemacht wird – **„verpasst“ gibt es nicht** |

Erledigt = im ±1-Tag-Fenster abgeschlossen; ein Abschluss belegt höchstens ein Vorkommen (das früheste freie im Fenster). Bleibt ein Abschluss übrig (Zusatztraining), holt er das älteste offene Vorkommen derselben Einheit nach. Offenes bleibt bis 28 Tage zurück (oder ab Veröffentlichung des Plans) sichtbar; auf der Startkarte erscheint pro Einheit nur das älteste offene Vorkommen. Startkarte (`openOccurrences`: überfällig → fällig → ab jetzt möglich) und „Meine Woche“ nutzen dieselbe Logik; Wochenübersicht über die Wochengrenze (So für Mo) eingeschlossen.

**Taskwarrior (Stufe 1, lesend/einseitig):** `fitness/plan_tasks.py` (typer + tasklib) spiegelt die Vorkommen aus dem *lokalen* Runtime-Stand (`~/.aos/fitness/users/<uid>/macrocycles` + `workouts.json`) in eine eigene Taskwarrior-DB je Klient: `~/.aos/fitness/users/<uid>/taskwarrior/` (eigenes `taskrc`, UDAs `occkey`/`planid`/`routineid`/`workoutid`). `scheduled` = Vortag 00:00, `due` = Plantag 23:59, erledigt = `task done`; nicht mehr veröffentlichte Pläne löschen ihre offenen Tasks; idempotent über `occkey = Plan:Einheit:Datum`. Aufruf: `python -m fitness.plan_tasks sync <uid>` / `pending <uid>`, API `POST /fitness/coach/macrocycles/taskwarrior/<uid>/sync` und `GET …/<uid>/pending`. Die Python-Logik spiegelt `occurrences.js` (Tests: `test_plan_tasks.py`).

**Offen (Stufe 2):** Firestore ist die Quelle der Wahrheit für die Web-App; das lokale Backend sieht Firestore-Pläne/Workouts noch nicht. Nötig: Sync Firestore → lokaler Runtime-Stand (z. B. der bestehende `fitness-firestore-daemon`) und optional Rückrichtung (`task done` → Workout/Abschluss), Auslöser (Timer/Daemon statt manuell).

## Mobiler Planeditor (2026-10-30)

`PlanEditor.jsx` ist eine eigene Kompositionsoberfläche für vollständige Pläne.
`TrainingPlans` erstellt einen privaten Plan und öffnet ihn unmittelbar über
`PlanCard`. Trainingstage enthalten ihre eigenen Übungs-Snapshots; vorgelagerte
Workout-Vorlagen sind optional. Tage lassen sich duplizieren und umordnen,
Übungen per Katalog hinzufügen und mit `ExerciseRow` einschließlich Satzvorgaben,
Tracking, RIR, Pause und Notizen bearbeiten. Sortierung unterstützt Pointer und
Tastatur. Die Vorschau zeigt den noch unveröffentlichten Stand.

Lokale Entwürfe sind nach angemeldetem Bearbeiter, Klient und Plan isoliert.
Beim erneuten Öffnen entscheidet der Nutzer über Wiederaufnahme oder Verwerfen.
Ein atomarer `updateMacrocycle` schreibt Name, Hinweise, Dauer und komplette
Trainingstage, ohne den veröffentlichten Snapshot zu verändern. Beide Adapter
prüfen `expectedUpdatedAt` und verweigern veraltete Entwürfe; diese bleiben lokal
verfügbar. `Entwurf sichern` führt zurück zur vorhandenen Versionsfreigabe.
Lokales Speichern ist kein geräteübergreifender Sync; dafür muss gesichert werden.

`CoachWorkspace` trennt Pläne, optionale Vorlagen und Ergebnisse über eine
Bereichsnavigation. Pläne sind der Einstieg nach der Klientenauswahl. `StrongApp`
zeigt Coaches einen hervorgehobenen Zugang mit Zweckbeschreibung.
