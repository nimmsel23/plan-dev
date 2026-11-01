# Plan development and Fitness integration

- `~/plan-dev` on `dev` is the canonical working checkout and source repository for the Plan mini-app.
- Plan owns the shared training-plan/program editor and plan logic; Coach consumes the pinned `modules/plan` Git submodule.
- Fitness resolves Plan through `vite-miniapp-submodules.mjs`: sibling `plan-app`/`plan-dev` first, then the historical nested `plan` path. Do not infer a current Fitness gitlink from old docs or copy editor fixes there.
- Plan's pre-push hook validates exports/builds; it does not automatically update Coach's pointer or publish Fitness.
- Standalone Plan, Coach, Fitness and VitalOS Shell release targets remain separate.
- Ownership, data contracts and pointer updates: `docs/PLAN-COACH-INTEGRATION.md`.

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

## Plan ownership and Coach consumption (2026-10-30)

Plan owns the shared training-plan editor, program composition, versioning and assignment logic.
Coach consumes the code through its pinned `modules/plan` Git submodule. Change the source here,
commit it, then deliberately advance Coach's pointer; do not maintain a second editor in Coach.
Publish Plan commits before pushing a Coach pointer referencing them.

Planbezogene Empfangsbestätigung und Feedback gehören ebenfalls Plan. Gemeinsamer Baustein: `src/views/Plan/components/PlanFeedback.jsx`; Daten-/Releasevertrag: [docs/PLAN-FEEDBACK.md](docs/PLAN-FEEDBACK.md). Zentralen Rules-Owner beibehalten.
