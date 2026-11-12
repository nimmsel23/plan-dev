# PATTERNS — wiederkehrende Fehler und Muster

### Release-Automerge und Release-PR hängen
Vorkommnisse: 2026-11-04 (Automerge schlägt manchmal fehl); 2026-11-08 (vos-release-pr für Shell-Pointer offen, Draft-PR #92); 2026-11-09 (AutoMerge-Stabilitätswache); 2026-11-10 (Draft-PR #43 gegen dev statt master geroutet, `TARGET_BRANCHES` falsch); Lektion/Gegenmaßnahme: Automerge bei Bedarf manuell mergen (`gh pr merge <nr> --merge -R nimmsel23/<repo>`). Zielbranch vor dem Öffnen eines PRs prüfen. Offene Release-PRs nicht liegen lassen.

### Shell-Pin hinkt dem Master hinterher
Vorkommnisse: 2026-11-08 (Shell-Pointer offen); 2026-11-10 (Pin `6340baac` rund 24 Commits hinter master); 2026-11-11 (rund 28 Commits hinter master, Org-Task geschlossen); Lektion/Gegenmaßnahme: Nach jedem Release `vos-release` bzw. `vos-ship` ausführen, damit der Shell-Pin auf `origin/master` zeigt. Den Pin-Stand im Org-Task festhalten.

### Lockfile-Drift nach Dependency-Änderungen
Vorkommnisse: 2026-11-04 (pnpm-Lockfile scheitert bei `vos-release` nach Modul-`package.json`-Änderungen); 2026-11-10 (Stack-Angleichung mit pnpm-workspace-overrides nötig); Lektion/Gegenmaßnahme: Nach Änderungen an `package.json` im Root `pnpm install --no-frozen-lockfile --lockfile-only` ausführen und die Lockfile-Änderung mitcommitten. `pnpm update <pkg>` ist keine Lösung.

### Fehlende KB-Quelle bricht Build und CI
Vorkommnisse: 2026-11-09 (Live-Deploy rot, weil die KB fehlte; Fix: Mount von `nimmsel23/fitness`); 2026-11-09 (kb-dir-Kandidatenpfade für Shell-CI und Coach-Nested-Checkouts ergänzt); 2026-11-11 (Shell-Deploy rot seit `a6c53d9`); Lektion/Gegenmaßnahme: Build-Skripte prüfen die KB-Quelle explizit und brechen mit klarer Meldung ab. Die CI bindet das KB-Repo ein. Checkout-Pfade nicht nur über Geschwisterordner erwarten.

### Vite-8/Rolldown-Build-Inkompatibilitäten
Vorkommnisse: 2026-11-09 (`build.target: 'modules'` durch Browserliste ersetzt, um `BUNDLER_INITIALIZE_ERROR` vorzubeugen); 2026-11-10 (`manualChunks` in Function-Form nötig); Lektion/Gegenmaßnahme: Bei Vite-Majors `build.target` und `manualChunks` vorab auf Rolldown-Kompatibilität prüfen.

### Gemini-CI-Agent scheitert an der Tool-Schnittstelle
Vorkommnisse: 2026-11-07 (Journal-Lauf: `gh pr list` mit unbekanntem JSON-Feld `baseRepository`, Analyse-Step mit Exit 1); 2026-11-07 (No-op-Ausgänge und Deploy-Routing korrigiert); Lektion/Gegenmaßnahme: Nur unterstützte `gh`-JSON-Felder verwenden und den Head-Filter `nimmsel23:<branch>` nutzen. Ein echter roter Reparaturlauf ist noch nicht als Abnahme belegt.

### Fremdes Working-Tree-WIP paralleler Sessions
Vorkommnisse: 2026-11-09 (fremdes `docs/CLAUDE.md` und `archive/*`); 2026-11-11 (fremdes `scripts/portal.mjs`); 2026-09-09 (parallele Session blockiert `fitness-release` durch unstaged Journal-WIP); Lektion/Gegenmaßnahme: Nur eigene Dateien stagen und committen. Fremdes WIP unangetastet lassen und im Log vermerken. Release bei fremdem Dirty-State abbrechen, nicht aufräumen.

### Stiller Datenverlust durch Session-Vertrag
Vorkommnisse: 2026-07-12 (`GET /sessions` lieferte nur Metadaten, der Editor überschrieb leer; Ursache für Datenverlust); 2026-07-12 (Dirty-Edits gingen bei Datumswechsel verloren); 2026-09-05 (Dirty-Flush und `savingRef`-Race-Fixes); Lektion/Gegenmaßnahme: API-Verträge zwischen Node, Python und Firestore gleich halten. Vor Datums- und Session-Wechseln immer flushen. Gelöschte Sessions dürfen nicht durch den Flush zurückkommen.
