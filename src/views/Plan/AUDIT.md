# views/Plan/ — Audit

## Struktur (Stand 2026-08-21)

```
views/Plan/
├── index.jsx              — Router (WorkoutList ↔ RoutineBuilder ↔ WorkoutSession)
├── api.js                 — lokal/Firestore-Dispatch (isLocalMode()-Weiche)
├── WorkoutList.jsx         — Orchestrierung: Templates+Workouts laden, Aktionen, Layout
├── TrainingPlans.jsx       — Orchestrierung: Trainingspläne (Makro) laden, Aktionen, Layout
├── RoutineBuilder.jsx      — Orchestrierung: Template-Editor (Übungen, Reihenfolge)
├── WorkoutSession.jsx      — Orchestrierung: laufendes Workout loggen
├── AssignedMacrocycles.jsx — Klienten-Ansicht zugewiesener Makrozyklen (Coach→Klient)
├── AssignedPlans.jsx       — kleine Liste zugewiesener Pläne
├── components/
│   ├── RoutineCard.jsx           — eine Template-Karte (Vorschau, Start, Quick-Complete, Menü)
│   ├── RoutineFolder.jsx         — Ordner-Gruppierung (nach category) für RoutineCard-Grids
│   ├── CalisthenicsSkillsSection.jsx — eigener fester Ordner für category=calisthenics-skill
│   ├── NextUpCard.jsx            — "Heute dran"-Karte (Template-Ebene, alle Templates)
│   ├── TemplatePicker.jsx        — Dropdown-Liste beim Hinzufügen eines Templates zu einem Plan
│   ├── PlanCard.jsx              — ein Trainingsplan (Makro): Templates, Ziele, Pensum, Heute dran
│   ├── SetRow.jsx                — eine Satz-Zeile in WorkoutSession
│   ├── ExerciseBlock.jsx         — eine Übung (Kopf + Sätze) in WorkoutSession
│   ├── ExerciseRow.jsx           — eine Übungszeile (Drag+Detail-Formular) in RoutineBuilder
│   ├── ExerciseSearch.jsx, ExerciseChecklist.jsx, MuscleHeatmap.jsx, BodyMap.jsx — bereits vorher hier
├── lib/
│   ├── restTimer.js        — Rest-Timer localStorage-Persistenz + SW-Notification
│   └── templateSets.js     — ensureTemplateSets()/patchTemplateSets() (Legacy↔neues Format)
```

**Regel ab jetzt:** neue Sub-Komponenten (irgendetwas mit eigenem sichtbarem
State/Markup-Block > ~20 Zeilen) gehören nach `components/`, reine
Datenlogik ohne JSX nach `lib/`. Die `*.jsx`-Dateien direkt in `views/Plan/`
sind nur noch Orchestrierung (laden, Aktionen definieren, Layout
zusammensetzen) — kein Feature-Markup mehr direkt inline.

---

## Zwei Ebenen: Templates (Mikro) und Trainingsplan (Makro)

- **Template** (`fitness/{uid}/routines/{id}`, UI-Begriff "Routine"/"Vorlage") =
  eine einzelne Workout-Vorlage: Name + Übungen mit Satz-Zielwerten. Wird
  entweder direkt im `RoutineBuilder` von Hand gebaut, oder — Basisfunktion,
  die vorher fehlte — aus einem frei geloggten Workout heraus per "Als
  Vorlage"-Button in `WorkoutSession.jsx` gespeichert (`saveAsTemplate()`).
- **Trainingsplan** (Makro, technisch ein Makrozyklus,
  `fitness/{uid}/macrocycles/{id}`) = mehrere Templates gebündelt, jedes mit
  eigenem Zeitraum-Ziel (`targetCount`/`targetPeriodDays` pro Plan-Routine,
  x-mal in y Tagen, rollierendes Fenster). Referenziert das Ursprungs-Template
  über `sourceTemplateId` — Fortschritt wird gegen echte Workout-Completions
  gezählt (`workouts.routine_id === sourceTemplateId`), kein separater
  Complete-Mechanismus.
- **"Pensum erfüllt"** = alle Templates mit gesetztem Ziel in einem Plan
  haben ihr Ziel im eigenen Zeitfenster erreicht. Lebt nur noch in
  `PlanCard.jsx` (eine Stelle) — eine frühere Duplikat-Anzeige direkt auf
  Templates (`PensumSummary` in `WorkoutList.jsx`, sowie das Pendant
  `ClientHabits.jsx` im Coach-Tab) wurde entfernt, weil sie denselben
  Zustand ein zweites Mal, unabhängig vom Plan, gezeigt hat.

**Explizit NICHT gewollt:** ein separates "Habit"-Objekt/-Konzept neben dem
Trainingsplan. Der Trainingsplan *ist* der Habit-artige Mechanismus
(Zeitraum-Ziel pro Template) — kein zusätzliches Vokabular, keine zweite
UI dafür.

---

## Self-Service UND Coach — ein Komponent, zwei Aufrufer

`TrainingPlans.jsx` (und damit `PlanCard.jsx`) nimmt optional `clientUid`.
Ohne `clientUid`: Self-Service (eigener `getUid()`). Mit `clientUid`: Coach
sieht/bearbeitet denselben Plan für einen Klienten (`views/Coach/
ClientTrainingPlans.jsx`, dünner Lade-Wrapper). Beide Fälle laufen durch
denselben Code — kein zweiter Nachbau der Bündelungslogik im Coach-Tab.

Quick-Complete ("heute erledigt") funktioniert jetzt auch im Coach-Fall
(z.B. Coach hat live mit dem Klienten trainiert) — über
`quickCompleteClientRoutine()` (`lib/quickComplete.js`), das
`createClientWorkout`/`getClientWorkout`/`updateClientWorkout` aus `@db`
nutzt statt `views/Plan/api.js` (dessen Self-Service-Dispatcher im
Firestore-Modus kein `clientUid` kennt). Dafür wurden `createWorkout`/
`getWorkout`/`updateWorkout` (`firestore/workouts.js`) sowie `getRoutine`
(`firestore/routines.js`) um einen optionalen `uidOverride`-Parameter
erweitert (additiv, Default bleibt `getUid()`) statt die Logik zu
duplizieren. Ziel-**Setzen** ("Template hinzufügen" mit Zeitraum-Ziel)
funktionierte für den Coach bereits vorher.

`views/Coach/ClientPlan.jsx` (vormals `ClientHabits.jsx`) verwaltet nur noch
Templates selbst (Name, Übungen) — keine Ziel-Logik mehr, die gehört
ausschließlich in den Trainingsplan.

---

## Ordner/Kategorien (Strong-Vorbild)

Templates werden in "Meine Routinen" nach ihrem `category`-Feld gruppiert
(`RoutineFolder.jsx`), analog zu Strongs Ordner-Konzept. Kategorielose
Templates landen in "Ohne Ordner". Kategorie setzen: Karten-Menü →
"Ordner…". Calisthenics-Skills (`category === "calisthenics-skill"`)
bleiben ein eigener, immer vorhandener Bereich statt in die freien Ordner
gemischt zu werden.

---

## Erledigt seit erster Fassung dieses Dokuments

- **Wochen-Slider** (`src/components/WeekSlider.jsx`, HabitShare-artig,
  7-Tage-Strip Mo–So) ist in `PlanCard.jsx` verdrahtet, ersetzt den
  einzelnen Erledigt-Haken. Nur der heutige Tag ist antippbar, für
  Self-Service UND Coach gleichermaßen.
- **Pro-Tag-Kommentar Coach↔Klient** auf Plan-Ebene: neue Funktion
  `saveWorkoutFeedback(clientUid, workoutId, text)` (lokal + Firestore,
  `lib/db/{local,firestore}/coach.js`) schreibt `coachFeedback` direkt aufs
  Workout-Dokument (`fitness/{uid}/workouts/{id}`) — eigener Speicher als
  das ältere `saveCoachFeedback` (das schreibt aufs alte Session-JSON-Modell,
  `sessions/journal/habitJournals`, nicht auf `workouts`). Kommentar-Icon im
  `WeekSlider` auf erledigten Tagen: Coach kann schreiben/bearbeiten, Klient
  sieht denselben Kommentar read-only (Icon erscheint auch ohne
  `onComment`-Prop, wenn `workout.coachFeedback` gesetzt ist).
- **Quick-Complete für Coach** (z.B. Coach hat live mit dem Klienten
  trainiert): `quickCompleteClientRoutine()` in `lib/quickComplete.js`,
  nutzt neue `createClientWorkout`/`getClientWorkout`/`updateClientWorkout`
  (lokal + Firestore). Firestore-Seite: `createWorkout`/`getWorkout`/
  `updateWorkout`/`getRoutine` um optionalen `uidOverride`-Parameter
  erweitert statt Logik zu duplizieren.
- **URL-Hashing für den Plan-Tab**: `App.jsx` kennt jetzt `view`/`id`
  Query-Parameter, aber nur wenn `tab=session&subTab=plan`
  (`#session/plan?view=routine&id=<routineId>` bzw. `?view=workout&id=…`).
  `PlanView` (`views/Plan/index.jsx`) nimmt optional `routeView`/`routeId`/
  `onRouteChange` von `Session/index.jsx` (die wiederum von `App.jsx`
  kommen) — ist die Komponente "controlled", fällt sonst auf ihren
  bisherigen internen `useState`-Route zurück (bleibt eigenständig
  einbindbar). Verlassen des `plan`-Subtabs räumt `planView`/`planId` in
  `App.jsx` automatisch weg (kein stale Deep-Link beim nächsten Öffnen).

## Offene Punkte

Keine bekannt — alle vier ursprünglich offenen Punkte (Wochen-Slider,
Pro-Tag-Kommentar, Coach-Quick-Complete, URL-Hashing) sind umgesetzt.

Nicht abgedeckt vom URL-Hashing: welcher **Trainingsplan** (`TrainingPlans`-
Sektion) aufgeklappt ist, und welches Plan-Template innerhalb davon
"aufgeklappt" ist (kein Deep-Link dahin) — nur die WorkoutList/RoutineBuilder/
WorkoutSession-Ebene (`view`/`id`) ist verlinkbar.
- Quick-Complete für Coach im Firestore-Modus (siehe oben) — bewusst
  deaktiviert statt unsicher gebaut.

---

## Strong-App-Modus (`plan.html` → `StrongApp.jsx`, 2026-10-11)

Der standalone Plan-Build (`npm run build:firebase:plan`, vos-plan.web.app)
läuft jetzt als Strong-artige App mit Tab-Leiste unten:

| Tab | Datei | Inhalt |
|-----|-------|--------|
| Profil | `ProfileView.jsx` | Gesamt-Workouts/-Volumen/-Zeit, "Workouts pro Woche" (8 Wochen) |
| Verlauf | `HistoryView.jsx` | abgeschlossene Workouts nach Monat, Dauer/Volumen/Rekorde/bester Satz, Detail + Löschen |
| Workout | `index.jsx` (PlanView) | Vorlagen, Trainingspläne, leeres Workout — unverändert, nur "controlled" geroutet |
| Übungen | `ExercisesView.jsx` | alle trainierten Übungen A–Z → `components/ExerciseDetail.jsx` (Verlauf/Diagramme/Rekorde) |

Neu im laufenden Workout (`WorkoutSession.jsx`, gilt auch im Haupt-App-Plan-Tab):
- **"Vorher"-Spalte** (`SetRow`/`ExerciseBlock`, `previousSets`): indexgleicher
  Satz der letzten abgeschlossenen Ausführung, antippen übernimmt die Werte;
  hat Vorrang vor Template-Ghost-Werten beim Abhaken leerer Sätze.
- **Workout-Uhr** im Kopf, **minimierte Leiste** über der Tab-Bar, solange ein
  Workout läuft (`lib/activeWorkout.js`, localStorage-Zeiger, wird beim
  Start der App gegen den Server geprüft).
- **Auto-Save** der Satz-Eingaben (1,2 s gebündelt, vor Satz/Übung
  hinzufügen/löschen sofort) — vorher gingen Eingaben bis "Fertig" nur im
  React-State verloren, wenn die App zuging.
- **Abschluss-Screen** (`components/WorkoutSummary.jsx`): Dauer, Volumen,
  Sätze, neue Rekorde, bester Satz pro Übung. Nicht abgehakte Sätze werden
  vor dem Beenden abgefragt; "Workout verwerfen" löscht das Workout.
- Übungsname antippen → Verlauf/Diagramme/Rekorde dieser Übung.

Datenquelle für alles: `eventLog` auf dem Workout-Meta-Dokument
(`lib/history.js`, reine Funktionen), d.h. ein `GET /workouts` reicht — kein
neues Firestore-Schema. `eventLog`-Einträge tragen seit diesem Stand
zusätzlich `name` (additiv); ältere Einträge zeigen einen aus `exercise_id`
abgeleiteten Namen. Rekorde (geschätztes 1RM nach Epley, Gewicht,
Satzvolumen) zählen erst ab der zweiten Ausführung einer Übung.

Bewusst nicht übernommen: Strongs "Measure"-Tab (Körperwerte leben im
Fitness-Hauptprojekt), Supersets, Plate-Calculator. Der Coach-Login-Gate in
`plan-main.jsx` bleibt unverändert.

## VitalOS shell (2026-10-16)

`StrongApp.jsx` owns the four navigation tabs and the active-workout return action.
It composes `src/shell/PlanSidebar`, `PlanHeader`, `PlanTabBar`, and `ThemeSheet`,
ported from coach-dev's VitalOS shell. Desktop uses the collapsible glass rail;
mobile uses five slots (four tabs plus More), with safe-area padding and a
collapsible navigation bar. The active-workout strip stays above navigation.
Settings remain in the existing Zustand store, with vital/vital-light defaults;
existing saved themes are preserved. `plan-main.jsx` owns authentication only
and no longer loads the legacy coach-console stylesheet.

## 2026-10-16: Strong-Ablauf und Coach-Workspace

Aktuelle Struktur und Grenzen: `ARCHITECTURE.md`. Der historische Audit oben
beschreibt teilweise abgelöste UI (Quick-Complete, Checklisten-Einstieg).

Behoben: Coach-only-Zugang im Plan-Einstieg, tote Einstellungen-Aktion,
Quick-Complete als dominanter Einstieg, nur aus Historie bestehender Übungen-Tab,
unbemerkter Verlust von Satzänderungen bei Remote-Fehlern und fehlende Startaktion
auf Plan-Einheiten. Ein gemeinsamer Vorlageneditor unterstützt jetzt Klienten-UIDs.
Neue Coach-Pläne können als Entwurf zusammengestellt und bereitgestellt werden.

Bekannte Grenzen: kein Mehrgeräte-Konfliktprotokoll, kein atomarer Start-Lock
zwischen Browser-Tabs, noch kein persistenter Entwurf für ungespeicherte
Vorlageneditor-Änderungen. Der lokale Satzentwurf ersetzt keinen vollständigen
Offline-Backendbetrieb. Authentifizierte Cloud-Abnahme steht separat aus.
Atlas bleibt eine eigene App; gemeinsam sind Quelle und Referenzen, kein
originübergreifender Gerätespeicher. Legacy-Checklisten werden als neue Workouts
startbar, ihr bisheriger Hakenfortschritt wird nicht als Leistung umgeschrieben.

## 2026-10-22: Auslieferung an Klienten

Neu: Klienten-Übersicht, Plan-Hinweis, Zurückziehen, Kopieren, Wochenplan,
Neu-Banner und Push (`onPlanPublished`). Details: `ARCHITECTURE.md`. Offen:
Versionierung veröffentlichter Pläne, atomares Kopieren, Push-Token-Bereinigung
ungültiger Geräte, authentifizierte Geräte-Abnahme des Pushs.
