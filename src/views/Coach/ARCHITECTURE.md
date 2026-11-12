# View Architecture: Coach

Command Center für Coach-seitige Exercise-Freigabe, Klienten-Betreuung und Katalog-Enhancer. Erreichbar im Coach-Tab oder per `#coach` für den Coach Superuser (`isCoach()`).

## Komponenten

- **`index.jsx`**: reiner Tab-Router, seit 2026-08-20 (Teil 2) auf 3 Sub-Tabs
  reduziert (vorher 5 — siehe Update 2026-08-20 in `AUDIT.md` für die
  Vorgeschichte):
  1. `Übungsanfragen` (`InboxCard` / `useInbox`, weiterhin inline in `index.jsx`)
  2. `Katalog Browser` (`CatalogBrowser.jsx`)
  3. `Klienten` (`ClientsPanel.jsx`, seit 2026-08-20) — ersetzt die vorherigen
     drei getrennten Tabs `Klienten-Workouts`/`Plan-Zuweisung`/`Klienten`
- **`CatalogBrowser.jsx`**: Interaktiver Katalog-Enhancer zum Suchen, Analysieren (Anatomie-Cues, Biomechanik, Muskelgruppen) und Bearbeiten/Speichern von Übungen in Firestore (`fitness/kb/exercises`).
- **`ClientsPanel.jsx`** (seit 2026-08-20): Klientenzentrierter Workflow —
  links eine Liste aller User aus `getAllUserProfiles()` (Klick wählt einen
  Klienten), rechts ein Detail-Bereich mit zwei Sub-Tabs für den gewählten
  Klienten: `Workouts` (rendert `ClientWorkoutsFeed` mit `clientUid`-Prop)
  und `Trainingsplan` (rendert `AssignPlan` mit `clientUid`+`clientName`-Prop).
  Der `client`/`friend`-Status-Toggle (vorher `ClientManagement.jsx`, jetzt
  gelöscht) sitzt im Detail-Header. Löst den vorher dokumentierten
  "kein gemeinsamer State zwischen Tabs"-Punkt: Klientenauswahl passiert
  jetzt an einer Stelle statt separat pro Tab.
- **`ClientWorkoutsFeed.jsx`**: eigenständig nutzbar (Klienten-Dropdown +
  Typ-Filter, `getGlobalJournalFeed()`) **oder** eingebettet mit
  `clientUid`-Prop (kein eigener Dropdown, nutzt stattdessen
  `getClientJournalFeed(clientUid)` — siehe Datenfluss unten).
- **`AssignPlan.jsx`**: eigenständig nutzbar (Klienten-Dropdown aus
  `getAllUserProfiles()`) **oder** eingebettet mit `clientUid`+`clientName`-
  Props (`embedded`-Flag intern, blendet den Dropdown aus, lädt den Klienten
  per `useEffect` sofort). Baut einen Plan (`getPlanSuggestion()`,
  Template-Auswahl) und pusht ihn direkt an den Klienten
  (`assignPlanToClient()`). Zeigt bereits zugewiesene Pläne dieses Coaches an
  diesen Klienten inkl. Tages-Fortschritt (`getClientPlanProgress()`).

## Datenfluss (Firebase / Firestore)

- **Inbox**: `getGlobalInbox()` (in `firestore/sessions.js`) fragt `collectionGroup(db, "inbox")` ab und lädt alle ausstehenden Übungsanfragen (`pending_review`, `ai_enriched`), filtert `approved`/`rejected` raus.
- **Klienten-Feed (global, `ClientWorkoutsFeed` standalone)**: `getGlobalJournalFeed()` (`firestore/coach.js`) lädt per `collectionGroup` Daten aus `sessions`, `journal` und `habitJournals` über **alle** User, gedeckelt auf 50 Items **insgesamt** (nicht pro Klient). `getAllUserProfiles()` löst Namen/Metadaten über `profile` und `settings` Subcollections auf.
- **Klienten-Feed (gezielt, `ClientWorkoutsFeed` mit `clientUid`-Prop)**:
  `getClientJournalFeed(clientUid)` (`firestore/coach.js`, seit 2026-08-20) —
  direkte `collection(db, "fitness", clientUid, "sessions"|"journal"|"habitJournals")`-Query,
  keine `collectionGroup`, kein globaler Cutoff. Grund: der globale Feed kann
  bei mehreren aktiven Usern (Coach nutzt die App auch selbst) die Einträge
  eines bestimmten Klienten komplett verdrängen, bevor ein clientseitiger
  Filter sie sieht. Lokales Pendant: `local/coach.js::getClientJournalFeed()`
  → `GET /fitness/coach/feed?uid=<x>` (`server.mjs`), liest nur den einen
  `~/.aos/fitness/users/<uid>/`-Ordner statt aller.
- **Feedback**: `saveCoachFeedback()` speichert Kommentare direkt in der entsprechenden Klienten-Dokument-Referenz.
- **Katalog**: `searchExercises()`, `getAnatomy()`, `saveExercise()` arbeiten direkt mit `fitness/kb/exercises` und `fitness/kb/anatomy`.
- **Plan-Zuweisung**: `assignPlanToClient(coachUid, clientUid, plan)` — Firestore schreibt per `setDoc` (merge) auf `fitness/{clientUid}/wf_workouts/{planId}` (neue ID via `doc(collection(...)).id` falls `plan.id` fehlt); Local-Build ruft `POST /fitness/coach/plans/:clientUid` (`server.mjs`) auf, das nach `~/.aos/fitness/users/<clientUid>/plans/<planId>.json` schreibt. Beide Backends teilen sich dieselbe Funktionssignatur (`src/lib/db/{firestore,local}/assignedPlans.js`). Klienten-seitiges Abarbeiten des zugewiesenen Plans läuft außerhalb dieses View-Ordners in `src/views/Plan/AssignedPlans.jsx` (Training-Tab, kein eigener Coach-Unterpunkt).

## Destillat aus der RESULTS.md (2026-11-12)

Kurzfassung dauerhaft relevanten Wissens aus dem früheren Arbeitslog, thematisch einsortiert vom thin-results-Dienst.

## Design „Hidden Chamber“ (2026-08-31)

- Die Farbwerte liegen in `src/styles/coach-console.css`, scoped unter `.coach-console`. Sie überschreiben die bestehenden `fit-*`-Custom-Properties. Komponenten wurden deshalb nicht einzeln umgebaut.
- Die Theme-Klasse sitzt auf dem `app-shell`-Container und nur bei `tab === 'coach'`. Sonst bliebe die Sidebar im alten Theme.
- Exercise-Requests erscheinen als Karten-Grid (`cc-card-grid`) mit farbigen Ghost-Buttons. Katalog-Browser und Klienten-Panel nutzen `cc-panel` bzw. `cc-dossier`.
