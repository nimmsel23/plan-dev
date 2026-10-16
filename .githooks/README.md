# Git Hooks

Versionierte Git Hooks für dieses Repo. Nach einem frischen Clone aktivieren:

```bash
git config core.hooksPath .githooks
```

## Hooks

### pre-commit
Ein Teil, non-blocking (kein Commit wird verhindert):

1. **View-Docs-Reminder** (branch-unabhängig): warnt, wenn `src/views/<View>/*.jsx`
   staged ist ohne begleitendes `ARCHITECTURE.md`/`AUDIT.md`-Update. Siehe
   `src/views/AGENTS.md`. War bis 2026-07-12 ein loser, nicht-versionierter
   Hook direkt in `.git/hooks/` — jetzt hier mitversioniert.

**SW/Manifest-Bump entfernt (2026-07-22):** Bumpte früher automatisch
`public/sw.js` + `public/manifest.json` `version`-Feld bei jedem Commit auf
`master` mit Frontend-Änderungen — erzeugte Merge-Rauschen zwischen dev/master
für reine Versionszahlen. Ersetzt durch `scripts/stamp-sw.mjs`, das die
Cache-Version per Zeitstempel **post-build** direkt in `dist-firebase/`
stempelt (analog zu fuel-dev). `public/sw.js` (`fitness-v0`-Platzhalter) und
`public/manifest.json` (`version: "0"`) bleiben dauerhaft unverändert in der
getrackten Quelle.

### post-commit
**Retired (2026-07-12), jetzt No-Op.** Deployte früher bei jedem Commit auf
`master` — das war zu früh für mehrstufige lokale Arbeit. Deploy-Trigger ist
jetzt `pre-push` (s.u.). Datei bleibt als Stub liegen statt gelöscht zu werden,
damit ein aktives `core.hooksPath` nicht versehentlich die alte
Doppel-Deploy-Logik reaktiviert.

### pre-push
Baut + deployt zu Firebase (`npm run firebase`) wenn ein Push auf `master`
relevante Dateien enthält (`src/`, `public/`, `index.html`, `vite.config.*`,
`package.json`, `firebase.json`, Firestore-Configs).

- Trigger nur auf `master`, prüft alle gepushten Refs von stdin
- Vergleicht `remote_sha..local_sha` (bzw. den ganzen Branch bei neuem Remote-Ref)
- `cloud_chamber/`, Doku-Dateien und `dist-firebase/` selbst zählen **nicht**
  als Deploy-Grund — das ist Build-Output des vorherigen Laufs, sonst
  triggert sich der Hook bei jedem Push auf sich selbst
- `npm run firebase` = `build:firebase` (Vite-Build, dann
  `scripts/stamp-sw.mjs` stempelt die Cache-Version per Zeitstempel post-build
  direkt in `dist-firebase/`, `public/sw.js`/`public/manifest.json` bleiben
  unverändert) gefolgt von `deploy:firebase` (`firebase deploy --only hosting`)
- Schlägt der Build/Deploy fehl, wird der Push abgebrochen (kein halb-deployter
  Stand) — Override mit `git push --no-verify`

## CI-Deploy (GitHub Actions)
`.github/workflows/deploy-plan.yml` baut (`build:kb-data` + `build:firebase:plan`) und
deployt `hosting:plan` (https://vos-plan.web.app) bei jedem Push auf `dev`, der
Frontend-Code berührt. Ohne Repo-Secret `FIREBASE_SERVICE_ACCOUNT_FITNESS_AOS` wird nur
gebaut. Die geerbten Fitness-Workflows liegen in `.github/workflows.disabled/`.
Der `pre-push`-Hook deployt weiterhin nur bei Push auf `vitalos`.

