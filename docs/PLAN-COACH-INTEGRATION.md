# Plan und seine Verbraucher

Stand: 2026-11-09. Plan ist die **Brücke** zwischen Fitness-Klient und Coach:
geteilte Plan-UI und -Verträge liegen hier. Das Schmieden von Plänen für andere
User und jedes Local-Backend gehören nach Coach. Fitness berührt Coach-Code
nicht direkt; die Laptop-API ist eine Coach-Backdoor.

## Zuständigkeiten

| Bereich | Eigentümer |
| --- | --- |
| Geteilte Plan-UI (Editor, Feedback, Snapshots) als Brücken-Tab | Plan |
| Schmieden für Klienten, Coach-Workspace, Local-Backend/Backdoor | Coach |
| Programmentwürfe / Zuweisung (UI-Vertrag in Plan; Betrieb in Coach) | Coach hostet, Plan liefert Bausteine |
| Klientenoberfläche und Fitness-Integration | Fitness (Verbraucher von Plan) |
| Yuhonas Free Exercise DB (Pin) | Plan: `vendor/free-exercise-db` + `yuhonas.ref` |
| Zentrale Firestore-Regeln | VitalOS |

**Fork-Schuld in plan-dev:** `alembic/`, `db/`, Fitness-CLIs und
`npm start`→`plan-backend` stammen aus dem Fitness-Fork. Nicht ausbauen;
Zielort ist `coach-dev`. `runtime/` ist umgezogen (`coach-dev/plan_runtime/`,
coach-dev#14) und liegt nur noch in `archive/runtime/`.

Entwicklungsquelle ist `/home/alpha/plan-dev` auf `dev`. Im Coach-Repo liegt
`modules/plan` als Submodul von `nimmsel23/plan-dev`. Der Gitlink pinnt den Code;
`branch = dev` beschreibt nur die Quelllinie. Coach verwendet keinen unbemerkten
Fallback auf einen benachbarten Entwicklungscheckout. Auch ein späteres anderes
Coach-Frontend soll keinen zweiten Planeditor entwickeln.

## Öffentliche Bausteine

- `components/PlanFeedback.jsx`: gemeinsame Empfangsbestätigung und Rückmeldungen
  zu einer veröffentlichten Klientenplan-Version. Vertrag und Bedienung:
  [PLAN-FEEDBACK.md](PLAN-FEEDBACK.md).

- `src/views/Plan/PlanEditor.jsx`: Trainingstage und Übungen, Satzvorgaben,
  Duplizieren/Sortieren, lokale Entwürfe, Klientenvorschau. Ein expliziter `saveDraft`-
  Callback bindet die Persistenz des Hosts an; PlanCard liefert die bestehende
  Klientenplan-Speicherung. `actorUid` und `catalogSearch` ermöglichen lokale
  Nutzung ohne Firebase-Abhängigkeit.
- `ProgramEditor.jsx`: derselbe Editor für die Coach-Programmbibliothek.
- `lib/programDraft.js`: lädt ältere Programme mit Vorlagenverweisen und wandelt
  Planentwürfe zurück in Programme mit eigenen Übungssnapshots.
- `lib/programStore.js`: Programme speichern, feste Version veröffentlichen,
  eine Version als unabhängigen Klientenplan zuweisen.
- `TrainingPlans.jsx`: individuelle Klientenpläne einschließlich Versionen/Freigabe.
- `RoutineBuilder.jsx`: einzelne wiederverwendbare Workout-Vorlagen bearbeiten.

Coach liefert Identität, ausgewählten Klienten und Navigation. Seine eigenen
Editor-/Store-Dateien delegieren an diese Plan-Bausteine. Vite löst `@plan` gegen
das Submodul auf; Tailwind scannt dessen Quellen. Der Build generiert die nötigen
Katalogdaten aus Plan. Der Quellpfad `modules/plan` kollidiert nicht mit Coaches
bestehendem `/plan`-API-Proxy.

## Daten und Freigabe

Programme liegen unter `fitness/{coachUid}/coachTrainingPrograms`, ihre Versionen
unter `versions/vN`. Zuweisungen erzeugen Klienten-Snapshots unter
`fitness/{clientUid}/macrocycles` und Workout-Vorlagen unter `routines` samt
Übungs-Subcollections. Trainingsprotokolle bleiben unter `workouts`.

Ein Entwurf ist kein veröffentlichter Plan. Plan-Arbeitsstand (`routines`) und
freigegebener Snapshot (`published`) bleiben getrennt. Neue Programmversionen
ändern bestehende Klientenzuweisungen nicht. Die Quellvorlage darf spätere
Trainingsergebnisse ebenfalls nicht verändern.

Lokale Entwürfe sind gerätegebunden und nach Bearbeiter, Ziel und Plan isoliert;
Programmentwürfe verwenden einen eigenen Namensraum. Erst **Entwurf sichern**
überträgt den Stand. Speicherprüfungen mit `expectedUpdatedAt` verweigern veraltete
Entwürfe; sie sind kein automatischer Merge mehrerer Geräte.

## Änderungen übernehmen

1. Editor-/Planänderung hier in `plan-dev` implementieren, dokumentieren und committen.
2. `pnpm run test:plan` und den passenden Build prüfen. Die Tests umfassen auch
   alte Programme, Inline-Übungen, Veröffentlichung und Klientenzuweisung.
3. Nach ausdrücklicher Push-Freigabe zuerst die Plan-Commits veröffentlichen.
4. In Coach den gewünschten Commit auschecken und testen:

   ```sh
   git submodule update --init modules/plan
   git -C modules/plan fetch origin dev
   git -C modules/plan checkout --detach <geprüfter-plan-commit>
   pnpm run test:plan:contract
   pnpm run build
   git add modules/plan
   git commit -m "chore(coach): update Plan source"
   ```

5. Coach nur mit eigener Push-Freigabe veröffentlichen. CI initialisiert genau
   den gepinnten Commit; ein dort noch unbekannter Plan-Commit ist nicht baubar.

Code-Commit des ersten gemeinsamen Stands: Plan `4dbe020`, Coach `31dde02`.
Dokumentationsänderungen allein erfordern keinen Pointer-Bump. Fitness-Integration,
Standalone-Plan-Release, Coach-Hosting und VitalOS-Shell-Pointer sind getrennte
Schritte; ein Coach-Bump aktualisiert sie nicht automatisch.

Bedienung: [Plan verwenden](PLAN-WORKFLOW.md). Die vollständige Coach-Einbindung
und deren Tests sind in `coach-dev/docs/COACH-PLAN-WORKFLOW.md` dokumentiert.
Isolierte Tests/Builds ersetzen keine authentifizierte Cloud- oder Geräteabnahme.

## Lokaler Laptop-Einstieg

Coach stellt unter `http://127.0.0.1:9150/coach/local.html` denselben Editor ohne
Firebase-Anmeldung bereit. Das ist die Coach-Backdoor: `coach_local_plans.py`
lädt die Coach-eigene `plan_runtime/` (`local_plans.py` / `plan_delivery.py`).
Besitz und Weiterentwicklung dieses Backends liegen bei Coach; plan-dev hält
nur noch das Archiv `archive/runtime/`. Klientenwurzel: klienten-python.
Details: `coach-dev/docs/LOCAL-PLANNING.md`.

## Yuhonas-Pin

Submodul `vendor/free-exercise-db` (Branch `main`, aktuell in `yuhonas.ref`).
Client-Bilder: jsDelivr am Pin (`src/lib/yuhonas.pin.js`), damit Firebase nicht
~200MB spiegeln muss. Nach Submodul-Update: `node scripts/sync-yuhonas-pin.mjs`.
