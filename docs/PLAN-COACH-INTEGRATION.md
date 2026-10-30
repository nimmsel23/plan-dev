# Plan und seine Verbraucher

Stand: 2026-10-30. Maßgebliche Entscheidung: Plan besitzt den gemeinsamen
Trainingsplan-/Programmeditor und die Planlogik. Coach nutzt diesen Code über
ein bewusst aktualisiertes Git-Submodul. Fitness bleibt ein weiterer Verbraucher.

## Zuständigkeiten

| Bereich | Eigentümer |
| --- | --- |
| PlanEditor, ProgramEditor, RoutineBuilder und Übungsvorgaben | Plan |
| Programmentwürfe, Versionierung, Klientenzuweisung und Planadapter | Plan |
| Coach-Zugriff, Klientenwahl, Navigation und Hosting | Coach |
| Klientenoberfläche und Fitness-Integration | Fitness / jeweilige Klienten-App |
| Zentrale Firestore-Regeln | VitalOS |

Entwicklungsquelle ist `/home/alpha/plan-dev` auf `dev`. Im Coach-Repo liegt
`modules/plan` als Submodul von `nimmsel23/plan-dev`. Der Gitlink pinnt den Code;
`branch = dev` beschreibt nur die Quelllinie. Coach verwendet keinen unbemerkten
Fallback auf einen benachbarten Entwicklungscheckout. Auch ein späteres anderes
Coach-Frontend soll keinen zweiten Planeditor entwickeln.

## Öffentliche Bausteine

- `src/views/Plan/PlanEditor.jsx`: Trainingstage und Übungen, Satzvorgaben,
  Duplizieren/Sortieren, lokale Entwürfe, Klientenvorschau. Optionaler `saveDraft`-
  Callback bindet die Persistenz des Hosts an; der Standard sichert einen Klientenplan.
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
