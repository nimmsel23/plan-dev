# View Architecture: Session

Workout-Journal für Kraft- und Ausdauertraining. Zwei Session-Modi, Multi-Session pro Tag, Autosave, lokale Intelligenz (prevMap, Coverage-Gaps, Plan-Hint).

## Komponenten

- **`index.jsx`**: Thin Sub-Tab-Router — editor (default) / timer / skills / plan / history.
- **`useSession.js`**: State-Owner — Session-Modi, Multi-Session, Autosave/Flush, alle Handler.
- **`SessionEditor.jsx`**: Editor-Assembly — SessionHeader + ExerciseList + ActivityAddon (Basis-Abschnitt) + SessionSlots (zusätzliche Abschnitte) / ActivitySection (Cardio-Mode).
- **`SessionSlots.jsx`**: zusätzliche, frei benannte Abschnitte einer Strength-Session — jeder Slot ein weiterer Übungen+Activity+Notiz-Block wie der Basis-Abschnitt, additiv, kein Ersatz für ihn. Slot-Inhalt 1:1 als wiederverwendbarer "Baustein" pro Trainingsblock speicherbar (`lib/db/local|firestore/slotTemplates.js`).
- **`SessionGateCard.jsx`**: großes Start/Stop-Gate für den Trainingstag inkl. laufender Session-Stoppuhr und Live-Notification-Anbindung.
- **`SessionHistory.jsx`**: Verlauf-SubTab — Timeline, Drag&Drop-Umdatierung.
- **`SessionHeader.jsx`**: konsolidierter Header (ersetzt `DateStrip.jsx`/`SessionSwitcher.jsx`/`ModeSwitcher.jsx`) — Titel + Kalender-Sprung + Overflow-Menü, flacher Day-Strip, Session-Pills + Kraft/Ausdauer-Underline-Tabs.
- **`useDayStrip.js`**: Day-Strip-Fensterung/Navigation, von `SessionHeader.jsx` genutzt.
- **`ExerciseList.jsx`**: Übungsliste + QuickInput + ExerciseSearchOverlay + Hint/Gap-Banner.
- **`ExerciseCard.jsx`**: Einzelübung — `setsArray` (multi-set), NxM-Expansion, Drop-Set, prevMap-Stats, Trend-Badge, Recovery.
- **`ActivitySection.jsx`**: Cardio-Logger — im `cardio`-Mode die gesamte Session.
- **`ActivityAddon.jsx`**: Optionaler Cardio-Anhang an eine Strength-Session.
- **`SidebarSheet.jsx`**: Bottom-Sheet mit SessionSidebar (Block, Ort, Dauer, Effort, Notizen, Exports).
- **`MuscleMapModal.jsx`**: Anterior/Posterior BodyMap aller Session-Exercises + Anatomie-Detail.
- **`SourceSettingsModal.jsx`**: Übungsquellen-Toggle (wger/yuhonas/coach) via localStorage.
- **`WorkoutTimerCard.jsx`**: reine Stoppuhr, lebt im `skills`-SubTab, Lime-Akzent (`#c8ff00`).
- **`6pack/SixPackPromiseCard.jsx`**: Der `timer`-Subtab importiert die eigenständige 6Pack-Oberfläche aus dem Repo-Ordner `6pack/`. Home/Track/Day/Runner/Shuffle/Learn/Favorites/Selfies, Theme und KB-Generator liegen dort; Details in `6pack/README.md`. Der Runner sagt Übungen an, signalisiert Pausen akustisch und zeigt einen Video-Loop pro Übung. Die YAML-KB bleibt Datenquelle. Setzt `document.documentElement[data-theme]` auf `"sixpack"` solange gemountet und stellt den vorherigen Wert beim Verlassen wieder her.
- **`Skills/SkillsCard.jsx`**: Der `skills`-SubTab importiert die Calisthenics-Skill-Liste aus dem Repo-Ordner `Skills/`. Die Komponente verwaltet 14 Skills, Progressionen und Fortschritt in localStorage. Sie setzt `data-theme="skills"` solange gemountet; das Theme liegt in `Skills/skills.css`. Skill/Progressions-Daten sind aktuell in der Komponente hardcodiert, **nicht** verbunden mit `fitness/catalog/kb/exercises/calisthenics/*.yml` (siehe AUDIT.md).

## Session-Modi

- **`strength`**: Krafttraining — Basis-ExerciseList + optionaler ActivityAddon-Anhang, plus beliebig viele zusätzliche `SessionSlots` (je ein weiterer Übungen+Activity+Notiz-Abschnitt).
- **`cardio`**: Ausdauer — nur ActivitySection, keine Exercises, keine Gap-Hints, keine Slots.

## Session-Slots (seit 2026-08-25)

Zusätzliche, frei benannte Abschnitte einer Strength-Session — additiv zum
Basis-Abschnitt (Basis-`ExerciseList` + `ActivityAddon`), kein Ersatz dafür.
Mentalmodell: die Session ohne Slots ist der implizite erste Abschnitt,
jeder per "+ Slot hinzufügen" angelegte Slot ist ein weiterer, gleichartiger
Abschnitt danach (z.B. Basis="Rücken", Slot="Bizeps" als zweiter Teil eines
Pull-Days). Kein exklusiver Typ: ein Slot kombiniert frei Übungen, einen
Activity-Block (`activityType`/`duration`) und eine Notiz (`text`).
`exercises[]`-Einträge referenzieren ihren Slot über `slotId` (fehlt/`null`
= Basis-Abschnitt). Der Slot selbst ist der Baustein: "Als Baustein
speichern" snapshotted den kompletten Slot-Inhalt, wiederverwendbar pro
Trainingsblock (`getSlotTemplates(block)`/`saveSlotTemplate()`) —
perspektivisch die Brücke zwischen Session-Tab und Plan-Tab (noch nicht
umgesetzt).

**Kein `time`-Feld pro Slot** (2026-08-25, revertiert): Sessions werden nie
live im Gym geloggt, immer nachträglich — ein "jetzt"-Zeitstempel beim
Anlegen eines Slots wäre erfundene Präzision, kein echter Trainingszeitpunkt.
Uhrzeit/Ort sind Session-weite Kontext-Attribute (gehören ggf. in die
`SessionSidebar`, nicht dupliziert pro Slot) — aktuell nirgends als Feld
umgesetzt, da kein konkreter Bedarf.

**Drag & Drop (seit 2026-08-25):** `@dnd-kit` (schon Dependency von
`Plan/RoutineBuilder.jsx`, jetzt auch explizit in `package.json`) erlaubt
Übungen per Griff-Icon innerhalb einer Liste umzusortieren UND zwischen
Basis-Abschnitt und Slots zu verschieben. Ein einziger `DndContext` in
`SessionEditor.jsx` (strength-Zweig) umschließt Basis-`ExerciseList`
(`containerId="__base__"`) + alle Slot-`ExerciseList`s (`containerId=slot.id`).
`useSession.js::moveExercise(exerciseId, targetSlotId, targetContainerIndex)`
ist der eine Ort, der Container-Zugehörigkeit + Position im flachen
`exercises`-Array anfasst — sowohl DnD (`onDragEnd`) als auch die
Pfeil-Buttons in `ExerciseCard.jsx` (`moveEx(i, direction)`, jetzt ein
dünner Wrapper um `moveExercise`) laufen darüber, damit Nachbarn aus
fremden Containern nicht dazwischenrutschen.

**Bugfix 2026-08-25:** `ExerciseList.jsx` bekam vor Slots immer das volle,
ungefilterte `exercises`-Array — der lokale Map-Index (`idx`) war identisch
zum globalen Array-Index, den `updateEx`/`addSet`/`removeSet`/`removeEx`/
`replaceSets` erwarten. Mit Slots rendert `ExerciseList` nur noch gefilterte
Teilmengen (Basis: `!ex.slotId`, Slot: `ex.slotId === slot.id`) — der lokale
Index zeigte dadurch potenziell auf die falsche Übung im Gesamt-Array.
Fix: `SessionEditor.jsx` versieht jede Übung einmalig mit `__i` (ihr echter
Index im ungefilterten Array), `ExerciseList` nutzt `ex.__i` statt `idx` für
alle Mutations-Callbacks. `moveEx`/`moveExercise` sind davon unabhängig
korrekt (id-basiert). Ebenfalls gefixt: `addQuick()` erzeugte Übungen ganz
ohne `id`-Feld (nötig als Sortable-/Dedup-Key) — jetzt analog zu `addEx()`
`inbox_${slugify(name)}`.

## Session Gate

Vor dem manuellen Editor liegt ein leichtgewichtiges `sessionGate` im selben Session-Dokument:

```json
{
  "sessionGate": {
    "status": "active|completed",
    "startedAt": "2026-08-09T11:23:00.000Z",
    "endedAt": "2026-08-09T12:14:00.000Z"
  }
}
```

- Start loggt sofort den Fakt "Workout läuft", auch ohne Übungen.
- Stop beendet die Session und füllt bei leerem `duration` automatisch grob die Minuten.
- Der manuelle Editor bleibt bewusst getrennt darunter für das Nachtragen.
- Eine aktive Session kann best-effort eine laufende App-Service-Worker-Benachrichtigung halten.

## Multi-Session pro Tag

Pro Tag können mehrere Sessions existieren. `id: null` = Hauptsession, `id: "<timestamp>"` = Suffix-Session. Switcher-Bar zeigt alle Sessions des Tages. "+ Neues Workout" legt eine neue Suffix-Session an. Löschen ist für jede Session der Tagesliste möglich — auch die Hauptsession (seit 2026-07, Klienten-Request).

## Autosave

Kein Zeit-Debounce mehr (seit 2026-07). `scheduleAutoSave()` setzt nur das `dirty`-Flag. Gespeichert wird an semantischen Commit-Punkten: sofort bei `addEx`/`addQuick`, sonst via `flushDirty()` bei Tab-Hide/`pagehide`, Unmount (Haupt-Tab-Wechsel), Datumswechsel, Session-Wechsel und neuem Workout. `saveRef`/`dirtyRef`/`dateRef` halten die aktuellen Closures (stale-closure Workaround); der `dateRef`-Guard verhindert, dass der `listSessionsForDate`-Nachlauf eines Flush-Saves nach Datumswechsel die frische Tagesliste überschreibt.

## Datenformat

```json
{
  "date": "2026-06-22",
  "sessionMode": "strength",
  "block": "Push",
  "exercises": [{ "id": "...", "name": "...", "setsArray": [{"reps": "8", "weight": "80"}], "primaryMuscles": [...], "slotId": null }],
  "effort": 8,
  "location": "",
  "duration": "",
  "notes": "",
  "activity": { "type": "hiit", "duration": "", "notes": "" },
  "slots": [
    { "id": "uuid", "label": "Bizeps", "order": 0, "activityType": "hiit", "duration": "5", "text": "" }
  ]
}
```

## Destillat aus der RESULTS.md (2026-11-12)

Kurzfassung dauerhaft relevanten Wissens aus dem früheren Arbeitslog, thematisch einsortiert vom thin-results-Dienst.

## Datenvertrag und Stolpersteine (2026-07 bis 2026-09)

- `GET /sessions` liefert volle Session-Objekte (`sessionMode`, `activity`, `effort`, `exercises`), nicht nur Metadaten. Sonst lädt der Editor leer und überschreibt beim nächsten Save (Datenverlust-Vorfall 2026-07-12). Gilt für `server.mjs`, `fitness/catalog/api/api.py` und das Firestore-Pendant `listSessionsForDate`.
- Dirty-Flush: `flushDirty()` läuft vor Datumswechsel (`changeDate`), Session-Wechsel (`selectSession`), neuem Workout und beim Unmount. `handleDeleteSession` setzt `setDirty(false)`, sonst legt der Flush die gelöschte Session wieder an.
- `savingRef`-Guard: Der Draft-Effect setzt `syncState` nicht zurück, während ein Save läuft.
- Datumsbindung: Gate und Coach-Habit-Screen (`TodayPlan.jsx`) erscheinen nur bei `date === localToday()`. Die Ursache des hängenden Oktober-Datums war, dass `isTodayTab` nur `subTab` prüfte. Bei Datums-Deep-Links ist `subTab` leer.
- Kraft/Ausdauer-Wechsel: Enthält die offene Session bereits Übungen oder Aktivität, legt `switchSessionMode` eine neue Session an (`sessionHasLoggedWorkout()`). Nur eine leere Session wechselt in place.
- Datenfelder: RPE als Top-Level `effort`, Ort als `location`, Dauer als `duration`. Nie in `notes` packen. CLI: `fitness-log add --effort`, `--location`, `--duration`.
- Multi-Session: SQLite-Spalte `session_id`. Firestore-Pfad `sessions/{date}__{id}`. `sync.py` parst die Suffixe. Das Tages-Markdown bleibt bei `YYYY-MM-DD.md`.
- `moveSessionToDate` muss `sessionId` an `saveSession` und `deleteSession` weitergeben. Sonst werden benannte Zusatz-Sessions dupliziert statt verschoben.
- Bekannte Grenze: `moveSessionToDate` kann die Hauptsession des Zieldatums überschreiben und lässt bei Multi-Session-Tagen Suffix-Sessions als Waisen zurück (Stand 2026-07-12).

## Aufteilung und Bedienung (2026-09-05 bis 2026-09-24)

- `useSession.js` koordiniert Mini-Hooks: `useSessionHistory`, `useSessionRuntimeSync`, `useSessionCrud`, `useSessionExport`, `useExerciseList`, `useSessionActivity`, `useSessionSlots`, `useSessionGateController`. Der Rückgabevertrag bleibt stabil.
- `SessionModalsLayer.jsx` führt einen `activeModal`-State (`null` | `sidebar` | `settings` | `gate`).
- `ActivityAddon` und `ActivitySection` bleiben bewusst getrennt. Sie haben unterschiedliche Defaults (9 bzw. 10 Typen). Nicht zusammenführen. Activity-Typen liegen als Einzelmodule unter `src/constants/activities/` mit Barrel.
- `stepReps` und `stepWeight` bleiben bewusst getrennt. Sie parsen unterschiedlich.
- Session-Pill-Label kommt aus `classifySession()` (SSOT).
- Tastatur: Alt+←/→ wechselt die Tabs, ESC schließt das oberste Modal (`useEscapeKey`). Im Set-Grid springt Enter von Reps zu Weight und dann zur nächsten Zeile. ↑/↓ wechseln in derselben Spalte.
- Datumsleiste (`useDayStrip`): alle Tage in einem `overflow-x-auto`-Container, Scrollbar über `.no-scrollbar` ausgeblendet.
- `SessionGateCard` ist als „Mission-Konsole“ neu gestaltet. Props (`onStart`, `onStop`, `onSubNav`) und Verhalten blieben gleich. Keyframes liegen in `styles.css`.
