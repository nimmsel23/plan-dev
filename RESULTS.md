# RESULTS — Arbeitslog (ausgedünnt 2026-11-12; Destillat in den Doku-Dateien des Repos)

## Offen

- Deploy VitalOS Shell ist rot seit `a6c53d9` (Run `42992634220`). Übergabe an CTO am 2026-11-11. Status prüfen.
- Gemini-CI-Agent: Der erste echte rote Reparaturlauf als Abnahme (seit 2026-11-07) ist nicht bestätigt. Die Secrets `GEMINI_API_KEY` und `SYNC_TOKEN` sind gesetzt (2026-11-09 bis 2026-11-11).
- GitHub Pages: Quelle `dev /docs` in den Repo-Einstellungen prüfen bzw. aktivieren (seit 2026-11-07). Die Landingpage liegt in `docs/README.md`.
- Draft-PR #92: Status nach AL-LOG 2026-11-08 nicht nachgehalten.
- PlanFeedback (2026-11-01): Dort stand „noch kein Push oder Deployment“. Aktuellen Stand prüfen.
- Nicht geprüft: Plan-Tab mit echtem Firebase-Login (2026-10-23). Angemeldeter Shell-Browserdurchlauf (2026-10-16). Physischer Gerätetest für Offline-Cache und Service Worker (2026-10-16/17).
- Mehrgeräte: Enges Create-Race bei zwei gleichzeitigen Leerlisten-Antworten bleibt (2026-11-09).
- Session: `moveSessionToDate` kann die Hauptsession überschreiben und Suffix-Sessions verwaisen lassen (Stand 2026-07-12). Status prüfen.
- Backend-Parität: Route `habit-cycle` hat kein Python-Gegenstück (siehe docs/BACKEND.md).

## Notizen (aktiv)

- Shell-Pin: plan-app-Pointer `b0d44d47` entspricht `origin/master` (2026-11-11). Bei jedem Release erneut prüfen.
- Org-Queue `project:plan-dev` ist laut 2026-11-11 leer.
- Fremdes WIP (`scripts/portal.mjs`, `docs/apps.*`) wurde nicht angefasst. Nur eigene Dateien stagen.

## Offen (Sicherheitsnetz 2026-11-12: vom Bot zurückgestopft, in den Ziel-Docs nicht auffindbar)
- AL (Abend): `vos-release-pr plan` geschlossen/obsolet — kein offener Release-PR, `origin/dev`≡`origin/master` @ `d5f015ce`. Shell-Pin eskaliert Org-Task `35b1a180` (+ceo): plan-app Pin `6340baac` (~24 hinter master) → Owner `vos-ship plan`. Fremdes WIP `scripts/portal.mjs` unangetastet.
- `42551887610` / `42608497148` (0 offene Dependabot-PRs); letzter Squash
- Offene lokale Mehrgerät-Änderung (`resolveStart`, Firestore-Guard, `updatedAt`/`expectedUpdatedAt`, Konflikt-UI) inkl. AL-LOG committed und nach `origin/dev` gepusht; `plan-client` 7/7.
- Unangetastet: fremdes `docs/CLAUDE.md`, `archive/*`. Parallel offen: `coach-dev` `workouts.py` noch uncommitted.
- Tests in `plan-client.test.mjs` grün; TODO-Häkchen (Entwurf `8051c55f`, Versionierung, Mehrgerät) nachgezogen.
- Offen: `vos-release-pr plan` (Shell-Pointer) und Draft-PR #92 — siehe AL-LOG 2026-11-08.
- CI-Checks der Reparaturcommits grün; Modul-Promotion/Live-Deploy grün, Journals Live-Deploy war beim Eintrag noch in Arbeit. Ein echter roter Gemini-Reparaturlauf bleibt als Abnahme offen.
- Quellreparaturen werden auf den betroffenen Branch geschrieben; Zielbranch-Reparaturen erhalten einen PR und werden erst nach gruenem Check gemergt.
- **Fälligkeitsfenster ±24 h** (`lib/occurrences.js`, `f7181cf`, Korrektur `4e1ad47`): ab Vortag möglich → heute fällig → offen/überfällig; **kein „verpasst“** — Offenes bleibt offen, Zusatztraining holt das älteste offene Vorkommen nach; Backlog bis 28 Tage (`BACKLOG_DAYS`) bzw. ab Veröffentlichung.
- **Taskwarrior Stufe 1** (`fitness/plan_tasks.py`, typer + tasklib, `d0dec6d`): eigene TW-DB je Klient unter `~/.aos/fitness/users/<uid>/taskwarrior/`; pro Vorkommen ein Task (`scheduled` Vortag, `due` Plantag, Projekt `fitness.plan`, Key `occkey`), `task done` bei Abschluss, offene Tasks verschwinden bei zurückgezogenem Plan. CLI `python -m fitness.plan_tasks sync|pending <uid>`, API `POST /fitness/coach/macrocycles/taskwarrior/<uid>/sync`, `GET …/<uid>/pending`. Einseitig, lokaler Stand.
- das offene `~/TODO.md`-Item zu Trapezius/Hamstrings), plus ein Aufräum-
- und den offenen `~/TODO.md`-Punkt zu fehlerhaften Trapezius-/Hamstrings-
- offen (User-Design-Entscheidung, `NEXT.md`).
- Bug lt. `catalog/CLAUDE.md`), keine der geänderten Dateien betroffen.
- plus vorab die vom Vorgänger-Turn offene Standing-Push-Aufgabe abgeschlossen.
- Betroffene Katalog-Tests grün (`test_exercise_schema`, `test_inbox_pipeline`,
- Staging-Deploy (`fitness-preview.service` :8100) per Post-Push-Hook grün. Betroffene
- werden. Bisher bog der Umschalter den Modus immer direkt in der offenen Session um,
- via `sessionHasLoggedWorkout()`, ob in der offenen Session bereits Übungen/Aktivität
- Hook **`src/hooks/useEscapeKey.js`**. ESC schließt jetzt das oberste offene
- Input/offenem Modal); Set-Grid: `Enter` Reps→Weight→nächste Zeile, `↑/↓`
- offenem Session-Modal nicht mehr den Haupt-Tab wechselt.
- Offen bleibt: `approveInbox()` laeuft im Firebase-DB-Layer noch direkt gegen
- Offen: `approveInbox()` im Firebase-DB-Layer schreibt weiterhin direkt nach
- weiteren Context-Compact hat der Nutzer die letzte offene Doku-Aufgabe aus
- `PHASE4_TODO.md` freigegeben ("ja schreib die docs noch") und danach
- TODO, SOT-Doku) gepusht, in `vitalos` gemergt und nach `fitness-aos.web.app`
- **`src/views/Session/PHASE4_TODO.md`**: Definition-of-Done Punkt 3 auf
- `[x]`. Kein Dual-DB-"eine Seite führt"-Beschluss getroffen (bewusst der
- Proxy (`e472849`) und das `server.mjs`-Modularisierungs-TODO (`81122fc`).
- `PHASE3_TODO.md`/`PHASE4_TODO.md` abgehakt. Alle Commits liegen lokal auf
- `SessionGateCard.jsx::SESSION_NAV_ITEMS`) — nur in **`PHASE4_TODO.md`**
- **`src/views/Session/PHASE3_TODO.md`** / **`PHASE4_TODO.md`** durchgängig
- aus `PHASE3_TODO.md` sind jetzt beide abgehakt.
- **`src/views/Session/PHASE3_TODO.md`** — Stück 2 und 3 vollständig
- angewiesen — die vier noch offenen Checkbox-Punkte zu `ExerciseCard.jsx` aus
- `PHASE3_TODO.md` (Stück 1) wurden einzeln durchgegangen und abgeschlossen.
- **`src/views/Session/PHASE3_TODO.md`** — Stück 1 (`ExerciseCard.jsx`)
- Transcript vom User gestoppt und offen als Fehleinschätzung benannt.
- "bereinigt" — Phase-3/4-TODOs entsprechend nachgeschärft (`stepReps`/
- **`src/views/Session/PHASE1_TODO.md` … `PHASE4_TODO.md`** (neu) — Vier
- daher zuerst durchgetestet statt aus TODO/NEXT zu raten. Zwei getrennte
- in der Coach-Inbox-UI zeigen, nicht nur im CLI-Coach-Sheet") war offen
- noch offen. `npm run build` grün.
- Offen geblieben: Task #3 aus der User-Taskliste ("Audit-Flags in
- fitness-dev gebaute Handoff-System (PreCompact füllt TODO/RESULTS/NEXT.md,
- automatisch `TODO.md`/`RESULTS.md`/`NEXT.md`/`CLAUDE.md` bei Edit/Write,
- Sessions in diesem Repo automatisiert: TODO.md (Makro) → Arbeit →
- RESULTS.md (was tatsächlich gemacht wurde) → NEXT.md (was offen blieb),
- `server.mjs` (Swagger/Zod-Autodoc, Node↔Python-Routen-Parität) — bewusst
- offen als allgemeines Dokument angelegt, nicht exklusiv auf ein Thema
- Nächstes ansteht, im Unterschied zu `TODO.md` (Makro-Backlog ohne Limit).
- eingeschränkt auf `Read,Edit`) automatisch `TODO.md`/`RESULTS.md`/
- Push), sobald `TODO.md`, `RESULTS.md`, `NEXT.md`, `docs/CLAUDE.md` oder
- Handoff-Konvention (`NEXT.md` bei unklarem Sessionstart zuerst lesen).
- # Swagger/OpenAPI-Autodoc + Zod-Validierung in server.mjs (2026-08-31)
- *Offen:** `moveSessionToDate` (Verlauf-Drag&Drop) kann weiterhin die Hauptsession des Zieldatums überschreiben und lässt bei Multi-Session-Tagen Suffix-Sessions als Waisen zurück. Doku (`AUDIT.md`/`ARCHITECTURE.md`) beschreibt noch DateHeader/ExerciseSection/2500ms-Debounce — veraltet. Prod-Deploy nach /opt noch nicht gemacht (User-Bestätigung nötig).
- Umsetzungsreihenfolge und Abnahmeszenarien. Implementierung als offene Aufgabe
- in TODO.md erfasst; dieses Ergebnis umfasst die Dokumentation.
- vorgaben ohne erfundene Standard-Sätze. Anzeige „Vorgaben offen“ und lokale
- Lokale Entwicklungspfade und betroffene Verknüpfungen auf `~/dev/*-dev` umgestellt. Runtime-Daten, Branches und Release-Checkouts behalten ihre Zuständigkeit. Keine Pushes oder Releases. Gesamter Umzug und Prüfungen: `~/RESULTS.md`.
- Gemeinsame PlanDeliveryOverview ergänzt: bereitgestellte Pläne, Entwürfe, ausdrücklicher Empfang und offener Antwortbedarf. Der Store kann für diese Übersicht nur den letzten Eintrag laden und wartet vor Statusaussagen auf beide Listener. Cache-/Fehlerzustände bleiben sichtbar. Coach verwendet die Übersicht in Liste und Workspace sowie einen historischen Plan-/Feedback-Viewer. Kein neuer Dienst, keine Rules-Änderung und kein Deployment.
- Die vendorte Mini-App-Shell mit der aktuellen VitalOS-Quelle synchronisiert. Ein langsamer Netzwerk-/Service-Worker-Updatecheck hält den Splash nicht mehr offen; er verschwindet nach dem App-Start (mindestens 200 ms, maximal 12 s nur falls der App-Root gar nicht bereit wird).
- ## 2026-11-01 — Lokale Freigabe offener Vorgaben
- Gemeinsame Freigabe-Vorprüfung nennt betroffene Trainingstage/Übungen. Leere

--------------------------------------------------------------------------
<!-- thin-results-Grenze 2026-11-12: BIS HIERHER AUSGEDÜNNT — Destillat in den Doku-Dateien des Repos. Neue Einträge immer ÜBER diese Grenze. -->
