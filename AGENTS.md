# Plan development and Fitness integration

- `~/plan-dev` on `dev` is the canonical working checkout and source repository for the Plan mini-app.
- When Plan view files under `src/views/Plan/` are pushed from `plan-dev/dev`, its pre-push hook calls `fitness-dev/scripts/publish-mini-app-to-fitness.mjs`. The publisher copies those files into `fitness-dev/src/views/Plan/`, builds the Fitness bundle, commits the integrated view, and pushes `fitness-dev/dev`; Fitness CI then deploys the preview.
- `fitness-dev/src/views/Plan/` is the integrated Fitness copy. The old `fitness-dev/plan` submodule is not part of the current integration and must not be treated as the Plan development checkout.
- Fitness production follows `fitness-dev/dev` -> `~/vitalos/fitness-app` branch `vitalos` -> the `fitness-app` Gitlink in `~/vitalos` branch `master`. Fitness CI deploys standalone Fitness production; VitalOS CI deploys the shell with its pinned app sources.
- The Plan app deployed from `~/vitalos/plan-app` is a separate standalone shell app. Keep that release target distinct from Plan's Fitness-view sync.

<!-- release-weg:start -->
## Release-Weg und Branches (Plan)

Stand 2026-10-29. Ausführlich: `~/vitalos/docs/DEPLOYMENT.md` (GitHub: nimmsel23/vitalos, `docs/DEPLOYMENT.md`).

**dev → master → vitalos**

| Branch | Rolle | Lokal |
|---|---|---|
| `dev` | Edits und Previews (Preview-Channel `dev`, PR-Channel je PR) | ja — dieser Klon steht fest auf `dev` |
| `master` | **Standalone-Prod** (Hosting-Target `plan` = vos-plan.web.app); deployt nur per CI (`Live Deploy (Plan master)`) | nein, muss nicht existieren |
| `vitalos` | Stand für die Shell (`~/vitalos/plan-app`); darf hinter `master` liegen | nur als `-app`-Checkout im Meta-Repo |

- Release: `vos-release-pr plan` öffnet den PR `dev → master`. `Check (Plan)` läuft, bei Grün mergt der Auto-Merge
  (Merge-Commit) und startet den Live-Deploy per Dispatch. Nie von Hand auf `master` pushen, außer Hotfix.
- Shell: `vos-release plan` merged `origin/master` nach `vitalos` und bumpt den Pointer im Meta-Repo (deployt die Shell).
  Vorher `vos-overview`.
- `master` wird nie lokal ausgecheckt; `git fetch` genügt. Das Meta-Repo `vitalos` deployt nur noch die Shell.
- Nicht auf `dev` im Hauptordner arbeiten, wenn ein Agent-/Feature-Branch nötig ist: Worktree
  (`git worktree add .worktrees/<name> <branch>`).
- Default-Branch des Repos ist `master`; die `.github/workflows/*.yml` auf `master` bestimmen das Live-Verhalten.
<!-- release-weg:end -->
