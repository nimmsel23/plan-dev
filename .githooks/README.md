# Git Hooks

Nach einem frischen Clone die versionierten Hooks aktivieren:

```sh
git config core.hooksPath .githooks
```

## `pre-commit`

Gibt bei Änderungen an `src/views/<View>/` einen nicht blockierenden Hinweis,
wenn keine `ARCHITECTURE.md` oder `AUDIT.md` mitgeändert wurde.

## `pre-push`

- Push mit relevanten App-Änderungen auf `dev`: baut Plan mit
  `pnpm run build:firebase` als lokale Verifikation. Der GitHub-Workflow
  veröffentlicht danach den 24-Stunden-Preview.
- Push mit relevanten App-Änderungen auf `vitalos`: führt
  `pnpm run firebase` aus und deployt Plan Standalone auf Firebase Hosting
  (`hosting:plan`, `https://vos-plan.web.app`). Firestore-Rules werden hier
  nicht deployed.
- Push auf den Branch `fitness` löst keinen Deploy aus. Die Übernahme in
  Fitness läuft explizit über `npm run deploy:fitness`.

Reine Dokumentationsänderungen starten keinen Build oder Deploy. Ein Hook-
Fehler bricht den Push ab; `git push --no-verify` überspringt den Hook.

## Explizite Release-Befehle

- `npm run deploy:fitness`: übernimmt Plan in die Fitness-Integrationslinie,
  baut Fitness und pusht dessen `dev`-Branch.
- `npm run deploy:vos`: ruft `vos-release plan` auf. Der Release-Workflow
  übernimmt Plan in `vitalos/plan-app`; der Push auf Plan-`vitalos` löst den
  Standalone Firebase-Deploy aus.
