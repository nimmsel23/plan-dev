# Plan — Deploy und Installierbarkeit

Stand 2026-11-01. Diese Datei hält die kritischen Deploy-Regeln für `plan-dev` fest. Ausführlich zum
Gesamtweg: `~/vitalos/docs/DEPLOYMENT.md` und `~/dev/fitness-dev/docs/DEPLOY.md`.

## Release-Weg

`dev` → `master` (PR, `vos-release-pr plan` oder `vos-ship plan`) → `vitalos` (`vos-release plan`).
Nie von Hand auf `master` pushen. Rückwärts (`vitalos`/`master` → `dev`) wird nur gemergt, wenn am
falschen Checkout editiert wurde.

## Pflicht: `master` muss standalone installierbar sein

`plan-dev` wird von **fremden Pipelines** auf `master` ausgecheckt und mit dem **eigenen** Lockfile
installiert, zum Beispiel vom Standalone-Deploy der Fitness-PWA (`fitness-dev`,
`.github/workflows/deploy-standalone.yml`: Plan wird dort mitkompiliert). Dafür gilt:

```bash
pnpm install --frozen-lockfile --ignore-scripts   # muss auf einem frischen Klon von master gelingen
```

Das scheiterte bis 2026-11-01: `package.json` enthielt `"@vos/cross-app-aliases": "workspace:*"`
(`optionalDependencies`), der Lockfile aber keinen Eintrag, und ein `workspace:*`-Paket lässt sich
außerhalb des Meta-Workspaces nicht auflösen → `ERR_PNPM_OUTDATED_LOCKFILE`.

## Kritische Änderung 2026-11-01: `@vos/cross-app-aliases` entfernt

- **Warum:** Plan nutzt aus dem Paket nur `@learn` (eine Datei, `src/App.jsx`). `siblingDir()` in
  `vite.config.js` löst `@relax`/`@learn` über die Nachbar-Checkouts auf (`~/dev/<x>-dev`,
  `~/vitalos/<x>-app` oder daneben) — das Paket war nur eine Abkürzung mit Fallback.
- **Was:** Eintrag in `package.json` entfernt, `resolveCrossAppAliases()` ist jetzt synchron und liefert
  nur die Sibling-Auflösung. Der Lockfile musste sich nicht ändern (Eintrag war nie drin).
- **Verifiziert:** `vite build` in den Modi default, `firebase` und `plan` (lokal); frozen Install auf
  frischem Klon.
- **Nicht wieder einführen.** Ein relativer `link:`/`workspace:`-Eintrag macht den Lockfile abhängig vom
  Installationsort (`../../vitalos/packages/…` aus `~/dev/x`, `../packages/…` im Worktree
  `~/vitalos/x-app`) und blockiert standalone Installs und Releases.

## Lockfile-Regeln

- Der Lockfile dieses Repos ist die Wahrheit für den Standalone-Weg. Bei Dependency-Änderungen
  `pnpm install` ausführen und `pnpm-lock.yaml` mit der `package.json` zusammen committen.
- Das Meta-Repo `~/vitalos` hat einen **eigenen Root-Lockfile** für die Shell; der wird beim Release
  (`vos-release`/`vos-ship`) nachgezogen. Das ist unabhängig von diesem Repo-Lockfile.

## Prüfen vor einem Release

1. `pnpm install --frozen-lockfile --lockfile-only` → muss grün sein.
2. `pnpm exec vite build --mode plan` und `--mode firebase` → müssen bauen.
3. `git diff origin/master origin/dev -- package.json pnpm-lock.yaml` ansehen: Dependency-Änderungen
   lösen im Meta-Repo einen Lockfile-Sync aus (der erste Live-Deploy kann einmal rot sein, siehe
   `~/vitalos/docs/DEPLOYMENT.md`).

## Keine verschachtelten Repos (2026-11-01)

`plan-dev` hat **keine Submodule** mehr. Die Gitlinks `coach-dev` (`dbf9b88`) und `6pack-dev` (`b208e32`)
samt `.gitmodules` sind entfernt; beide sind eigene Repos und liegen bei Bedarf als **Nachbar-Checkouts**
neben `plan-dev` (`~/dev/coach-dev`, `~/dev/6pack-dev`). Nicht wieder als Submodul einhängen — ein
verschachtelter Klon veraltet unbemerkt und verfälscht Builds. `6pack/` (Daten/Build-Skripte) ist ein
normaler Ordner im Repo und bleibt.

## Destillat aus der RESULTS.md (2026-11-12)

Kurzfassung dauerhaft relevanten Wissens aus dem früheren Arbeitslog, thematisch einsortiert vom thin-results-Dienst.

## Release- und Build-Stolpersteine (Stand 2026-11-12)

- Nach Änderungen an Modul-`package.json` scheitert `vos-release` am Lockfile. Abhilfe: `pnpm install --no-frozen-lockfile --lockfile-only` im Root, `pnpm-lock.yaml` mitcommitten. `pnpm update <pkg>` bläht das Lockfile nur auf und behebt den Fehler nicht.
- `@vos/cross-app-aliases` wird in fuel-dev und habits-dev als `optionalDependencies` mit fixierter Version `1.0.0` geführt, nicht als `file:../vitalos/...`-Pfad. Der Pfad löst nur im Standalone-Checkout auf. Die Vite-Configs haben einen Try/Catch-Fallback.
- Der Live-Deploy mountet das KB-Repo `nimmsel23/fitness` (prebuild, `KB_DIR`). Ohne diese Quelle bricht der Master-Deploy (Fix 2026-11-09).
- Der Pre-Push-Hook führt seit 2026-11-09 auf Branch `vitalos` keinen lokalen Firebase-Deploy mehr aus. Build und Reminder laufen auf `dev`.
- Der geerbte fitness-`deploy.sh` ist für Plan gesperrt. Plan überschreibt nie `/opt/fitness` und konfiguriert keine Fitness-Dienste um.
- Automerge der Release-PRs scheitert gelegentlich. Dann manuell: `gh pr merge <nr> --merge -R nimmsel23/<repo>`.
- Dependabot: Alerts und Security-Updates sind aktiv. Wöchentliche Versions-Updates für Actions, npm/pnpm und Python zielen auf `dev`. Minor und Patch sind gruppiert. Die vendorte mini-app-shell wird an ihrer Quelle gepflegt.
- Gemini-CI-Agent (`.github/ci-agent/repair.mjs`): `gh pr list` nur mit unterstützten JSON-Feldern aufrufen (`baseRepository` ist unbekannt) und den Head-Filter `nimmsel23:<branch>` nutzen. Quellreparaturen gehen auf den betroffenen Branch. Reparaturen für Zielbranches laufen über einen PR und werden erst nach grünem Check gemergt. Der Agent schreibt keine Lockfiles um.
- Vite 8 (Rolldown): `build.target` als Browserliste statt `'modules'` setzen (`es2020`, `edge88`, `firefox78`, `chrome87`, `safari14`). `manualChunks` in Function-Form schreiben. So vermeidet man `BUNDLER_INITIALIZE_ERROR`.
