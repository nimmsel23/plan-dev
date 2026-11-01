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
