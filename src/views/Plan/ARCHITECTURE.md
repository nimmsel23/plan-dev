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

## Shared Coach editor contract (2026-10-30)

Plan is the source owner for plan and program authoring. `ProgramEditor` adapts
legacy template-based programs to `PlanEditor`; `lib/programDraft` translates
between programs and plan drafts. Inline exercise snapshots become authoritative
after editing. `PlanEditor.saveDraft` accepts host persistence; local caches are
isolated between program and client editing. Coach supplies identity/navigation
and consumes this code via its pinned `plan` submodule. `lib/programStore` owns
program persistence, transactional versions and client assignments. Existing
Firestore paths remain unchanged.

## 2026-10-31 — Local authoring boundary

PlanEditor now requires an explicit saveDraft callback and accepts actorUid and
catalogSearch. It no longer imports auth or Firestore; PlanCard supplies its
existing persistence and ExerciseSearch lazily loads the cloud adapter only when
no catalog search is injected. runtime/local_plans.py owns atomic client drafts,
immutable local versions, stale-write protection and Markdown export.
runtime/plan_delivery.py publishes only an explicitly released snapshot; Coach
supplies registry location, HTTP endpoints and optional server credentials.
ClientForge conversion is an explicit import and never overwrites its source file.

## 2026-10-31 — Training-plan document

PlanDocument is the shared read-only plan surface. It renders real prescriptions
in per-day tables, with warm-up, training and finisher blocks. Mobile screens
stack table data into exercise cards; desktop and A4 retain table columns.
Unknown prescriptions remain marked; no template defaults are manufactured.
The print-only body portal isolates the document from app chrome. Program/source
notes are a disclosure outside the printable sheets. PlanEditor preview uses
the same document; consumers should expose it directly beside editing.

## 2026-11-01 — Planbezogene Rückmeldungen

`components/PlanFeedback.jsx` zeigt explizite Empfangsbestätigung, Fragen und Coach-Antworten je freigegebener Version. `lib/planResponseStore.js` erhält Firebase-Instanz/Identität vom Host; `lib/planResponses.js` bindet dessen Cloud-Alias an. PlanCard lädt den Bereich ausschließlich in Cloud-Modi für Coach-Pläne. Isolierter Pfad `planResponses/{uid}/plans/{id}/versions/vN` mit unveränderlicher Bestätigung und `entries`; Rules-Fragment gehört Plan, Veröffentlichung VitalOS. Älterer automatischer Gesehen-Status bleibt separat. Details und Grenzen: [PLAN-FEEDBACK.md](../../../docs/PLAN-FEEDBACK.md).

`components/PlanDeliveryOverview.jsx` ist der gemeinsame Statusbaustein für Coach-Klientenliste und Planübersicht. Optional bereits geladene Pläne verhindern erneute Listenabfragen im Workspace; die Klientenliste beobachtet Zuweisungen live und zeigt neue Pläne ohne Reload. Pro Planversion werden Receipt und genau ein letzter Eintrag abonniert; Bereinigung bei Klienten-/Versionswechsel. Antwortbedarf ergibt sich aus der Senderrolle des letzten Eintrags, nicht aus einem Lesemarker.

## ClientForge: Workout- und Übungs-Muskelansicht (2026-11-01)

`TrainingMuscleExplorer` ist der gemeinsame Baustein in PlanEditor,
CatalogDetail und interaktiver PlanDocument-Ansicht. Der ausgewählte
Trainingstag liefert die Workout-Zuordnung; Übungsklicks wechseln auf eine
Übung mit exakten Muskel-Labels, Haupt-/Nebenrollen, Anleitung und Notizen.
Die Körperkarte verwendet den vorhandenen KB-Adapter für die grobe Darstellung;
sie behauptet keine gemessene Belastung. Fehlende Metadaten werden angezeigt.
Der Druck rendert weiterhin Trainingsblätter ohne interaktive Körperkarten.
Die lokale und Cloud-Host-App liefern Identität, Speicher und Navigation.

Lokale Freigabe: `planReadiness.js` nennt offene Übungen vorab. Leere Satzlisten werden nicht durch eine beliebige Feldänderung als vollständig markiert; der Python-Runtime prüft dieselben Zielvorgaben und nennt die betroffene Übung.

## Drill 1 — Mikrozyklen / Periodisierung (2026-11-05)

Ein Makrozyklus hat optional `phases` (Mikrozyklen): aufeinanderfolgende Blöcke `{id, name, kind, weeks, volumePct, rirDelta, note}`
mit `kind` ∈ base/build/peak/deload/test. Logik: `lib/microcycles.js` (`normalizePhases`, `phaseTimeline`, `phaseForWeek`,
`planWeek`, `applyPhaseToRoutine`). Python-Spiegel: `macrocycles.py::_phases` (Änderungen immer an beiden Stellen).
`phases` ist Teil des Versions-Snapshots, aber nur wenn nicht leer (Alt-Pläne behalten Snapshot-Gleichheit); `restore` setzt sie zurück.
Beim Start einer Einheit aus dem Plan (PlanCard, CoachPlanToday) werden Satzzahl (Volumen-%) und RIR der aktuellen Phase auf den
Übungs-Snapshot angewendet; das Workout speichert `sourcePlanPhase {id,name,week}`. UI: `components/PhaseEditor.jsx` (Coach, im Klientenpfad),
Phasen-Banner in PlanCard/CoachPlanToday. Offen für Folge-Drills: Phase je Woche im Session-Tab (vos-training) anzeigen, Gewichtsprogression
pro Woche, Wochen-Overrides einzelner Übungen. Tests: `scripts/tests/plan-microcycles.test.mjs`, `test_plan_backend.py::test_phases_*`.

## Drill 2 — Plan → Session-Tab: Quick-Logging mit Vorbereitung (2026-11-05)

`Session/TodayPlan.jsx` (Gate für Klienten mit Coach-Plan) wählt jetzt die Einheit frei (Chips, „dran“ markiert), zeigt die
Phase der Woche und die phasen-angepasste Vorgabe (`prescriptionText`) und bietet **„Mit Vorbereitung loggen“**:
`lib/sessionDraft.js::routineToSessionDraft` baut daraus den `initialDraft` des Session-Editors (Sätze vorbereitet, Ist-Werte
leer, Vorgabe als Notiz „Ziel: …“, Block = Einheit + Phase + Plan). `Session/index.jsx` umgeht das Gate bei vorhandenem Draft
(sonst Endlosschleife nach Remount). Der Draft gilt nur, wenn für das Datum noch keine Session existiert (`resetSessionData`).
Die Habit-artige „erledigt“-Taste bleibt. Offen: Draft auch bei bereits bestehender Tages-Session anhängen, Plan-Workouts
(`views/Plan/WorkoutSession`) und Session-Log zusammenführen, Vorlagen (Mikro-Workouts ohne Plan) im Gate wählbar machen.
Tests: `scripts/tests/plan-session-draft.test.mjs`.

## Drill 3 — Gewichtsprogression je Phasenwoche (2026-11-05)

Phasen haben `weeklyWeightPct` (0–10, Default 0): ab Woche 2 einer Phase steigt jedes Zielgewicht um diesen Prozentsatz pro Woche
(Zinseszins, gerundet auf 0,5 kg; leere Zielgewichte bleiben leer). `microcycles.js::progressedWeight`, durchgereicht über
`applyPhaseToExercise/Routine(…, phase, week)` – damit wirken PlanCard-Start, CoachPlanToday, Session-Gate und Session-Draft einheitlich.
Python-Spiegel `_phases` ergänzt. Offen: absolute Gewichtsstufen pro Woche, Wochen-Overrides einzelner Übungen, Auto-Progression aus dem Log (letzte Leistung).

## Drill 4 — Einzel-Workouts im Session-Gate (2026-11-05)

`Session/TemplateLauncher.jsx` (im Gate `TodayPlan` unter der Einheiten-Karte) listet die Vorlagen/Einzel-Workouts des Nutzers
(`api.get('/routines')`, lokal wie Firestore) und lädt sie per `routineToSessionDraft` als Quick-Logging-Entwurf (ohne Phase).
Fehler/Leerzustand sichtbar (Erneut versuchen; leer = Bereich entfällt). Offen: das Gate erscheint nur für Nutzer mit Plan –
Nutzer ganz ohne Plan brauchen denselben Launcher im Editor-Leerzustand (`SessionEditor`); Entwurf an bestehende Tages-Session anhängen.

## Drill 5 — Coach: Fortschritt je Phase (2026-11-05)

`lib/phaseProgress.js::phaseProgress(plan, workouts, now)` liefert je Phase Soll (Wochentage bzw. Zeitraumziel × Wochen), Soll bisher,
absolvierte Einheiten (nur abgeschlossene Workouts mit `sourcePlanId` + `sourcePlanPhase.id`), Ø Anstrengung aus `feedback.effort` und
Zustand (past/current/upcoming). `components/PhaseProgress.jsx` zeigt das im Klientenpfad der `PlanCard` über dem `PhaseEditor`.
Workouts ohne Phasenbezug (Altbestand, freies Training) zählen bewusst nicht mit. Offen: Auswertung in der Klientenliste/Coach-Shell,
Soll-Ist je Übung (Gewichts-Ist vs. progressiertes Ziel), Entwurf an bestehende Tages-Session anhängen, Launcher ohne Plan.

## Drill 6 — Entwurf in bestehende Session + Launcher im Editor (2026-11-05)

`lib/sessionDraft.js::mergeDraftIntoExercises` fügt einen Entwurf in vorhandene Übungen ein (neue anhängen; gleiche `id` bekommt
zusätzliche vorbereitete Sätze, Zielnotiz ohne Duplikat; erfasste Ist-Werte bleiben). Zwei Wege nutzen es:
(1) `useSession`: ein `initialDraft` wird bei bereits bestehender Tages-Session einmalig eingefügt (`draftAppliedRef`) – vorher
ging er dort verloren; (2) `SessionEditor` hat über der Übungsliste „Workout / Vorlage laden“ (`TemplateLauncher` →
`exerciseOps.appendDraft` aus `useExerciseList`), damit auch Nutzer **ohne Plan** und mitten in einer Session Vorlagen laden können.
Offen: letzte Leistung je Übung im Draft (Prefill-Vorschlag, erst nach Bestätigung gültig), Phasen-Auswertung in der Coach-Shell,
Launcher lädt Vorlagenliste derzeit bei jedem Editor-Mount (lazy beim Öffnen wäre sparsamer).

## Drill 7 — „Letztes Mal“ im Entwurf (2026-11-05)

`sessionDraft.js`: `lastPerformanceMap(sessions, excludeDate)` (neueste Leistung je Übungsname aus der Session-Historie, leere Sätze ignoriert),
`lastPerformanceText` („Letztes Mal (02.11.): 8×60 · 7×60“), `withLastPerformance(draft, map)` hängt den Text an die Übungsnotiz.
Es bleibt **ein Vorschlag**: `setsArray` bleibt leer, nichts gilt ohne Bestätigung als absolviert. Genutzt im Session-Gate
(`TodayPlan`, lädt `getSessionHistory(30)`) und im Editor-Launcher (`prevMap` aus `useSessionHistory`). Nebenbei: `prescriptionText`
zeigt ohne Wiederholungsangabe „2 Sätze“ statt „2×“. Offen: Vorschlag per Tipp als Ist-Wert übernehmen (explizite Bestätigung),
Zuordnung über Übungs-ID statt Name, Phasen-Auswertung in der Coach-Shell.

## Drill 8 — „Wie letztes Mal übernehmen“ (2026-11-05)

`sessionDraft.js::adoptLastSets(current, prevSets)`: füllt ausschließlich leere reps/weight-Felder aus den Sätzen der letzten Einheit
(nach Index, darüber hinaus der letzte Vorwert), überschreibt nie, liefert `null` wenn nichts zu tun ist. `Session/ExerciseCard.jsx`
zeigt den Link „Wie letztes Mal übernehmen“ nur, wenn es etwas zu übernehmen gibt (`prev` = `prevMap[ex.name]`), die Übernahme ist
ein ausdrücklicher Tipp (Autosave über `replaceSets`). Offen: Zuordnung per Übungs-ID statt Name, Übernahme inkl. Progression
(+% aus Phase auf Vorgewicht), Phasen-Auswertung in der Coach-Shell (coach-dev, separates Repo).

## Browserabnahme Drills 1–8 (2026-11-05)

`pnpm run test:plan:browser` (isolierter Harness: temporäre Daten, eigene Ports, headless Thorium) läuft mit den Drills grün;
neuer Schritt: Coach legt eine Phase an, speichert, Banner „Woche 1/1 · Basis“ + „Fortschritt je Phase“ erscheinen, kein horizontaler
Überlauf bei Mobilbreite. Nicht im Harness abgedeckt: Session-Tab-Gate/Launcher/„Wie letztes Mal“ (liegen im Session-View, der
Harness mountet nur `views/Plan`) – dort bleibt es bei Unit-Tests (`plan-session-draft`). Eine authentifizierte Firebase-Abnahme steht aus.

## Browserabnahme Session-Gate (2026-11-05)

`pnpm run test:session:browser` (`scripts/tests/session-harness.jsx`, `session-browser.mjs`, `run-session-browser.sh`): mountet das echte
`Session/TodayPlan` mit einem Coach-Plan (Phasen Aufbau/Deload, Woche 2) im isolierten Harness auf 390 px Breite. Geprüft: Phasenbanner,
phasen-angepasste Vorgabe (5→3 Sätze, RIR 2→4), freie Einheitenwahl, „Mit Vorbereitung loggen“ liefert den Entwurf (leere Ist-Werte),
kein horizontaler Überlauf, keine Browserfehler. Seit dem Nachtrag auch im Browser: „Wie letztes Mal übernehmen“ (echte `ExerciseCard`, füllt nur leere Felder). Zusätzlich im Browser: TemplateLauncher gegen das Test-Backend (Vorlage anlegen, listen, Entwurf bauen). Weiter nur Unit-getestet: (früher) im
`ExerciseCard`, Einfügen in eine bestehende Tages-Session (`useSession`) – dafür müsste der Harness den gesamten Session-Editor mit
Session-Backend mounten.
