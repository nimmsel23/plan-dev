# Plan development and Fitness integration

**Simplicity (Owner 2026-11-11):** So simpel wie möglich. Ausnahme nur `vitalos/prod`. CI-Spine: Check → automerge-pr → automerge → Deploy (CI.md §1).

- Scoped fertige Arbeit: **immer committen** (nicht auf explizites „commit“ warten).
- `~/plan-dev` on `dev` is the canonical working checkout for the Plan mini-app —
  die **Brücke** zwischen Fitness-Klient und Coach, kein eigenes Local-Backend.
- Geteilte UI/Planlogik (Editor, Snapshots, Feedback) lebt hier; **Schmieden für
  andere User** und die Laptop-Backdoor gehören nach `coach-dev`. Fitness kommt
  mit Coach-Code nicht direkt in Berührung.
- Coach consumes the pinned `modules/plan` Git submodule. Fitness resolves Plan
  through `vite-miniapp-submodules.mjs` (sibling `plan-app`/`plan-dev`).
- Yuhonas Free Exercise DB: gepinntes Submodul `vendor/free-exercise-db` +
  `yuhonas.ref` / `src/lib/yuhonas.pin.js`. Bilder weiter per jsDelivr am Pin
  (kein Bundle der ~200MB). Pin nachziehen: Submodul updaten, dann
  `node scripts/sync-yuhonas-pin.mjs`.
- Fork-Schuld: Backendartiges (`runtime/`, `alembic/`, `db/`, …) stammt aus dem
  Fitness-Fork und gehört nach `coach-dev` — nicht weiter ausbauen. Kaputte
  Katalog-Symlinks/`fitnessctl*` → `archive/fitness-fork-schuld-2026-11-09/`.
  Python-Catalog: `coach-dev` (`coach catalog`); YAML-KB: `~/dev/fitness`.
  Karte: `~/dev/coach-dev/docs/OWNERSHIP-MAP.md`.
- Plan's pre-push hook validates exports/builds; it does not automatically update
  Coach's pointer or publish Fitness. Release targets remain separate.
- Ownership, data contracts and pointer updates: `docs/PLAN-COACH-INTEGRATION.md`.

<!-- release-weg:start -->
## Release-Weg und Branches (Plan)

Stand 2026-11-09. Ausführlich: `~/vitalos/docs/DEPLOYMENT.md`.

**dev → master** (+ Shell-Pin auf `origin/master`)

| Branch | Rolle | Lokal |
|---|---|---|
| `dev` | Edits und Previews (Preview-Channel `dev`, PR-Channel je PR) | ja — dieser Klon steht fest auf `dev` |
| `master` | **Standalone-Prod** (Hosting-Target `plan` = vos-plan.web.app); deployt nur per CI (`Live Deploy (Plan master)`) | nein, lokal nicht nötig |
| `vitalos` | **Legacy** (darf remote noch existieren) — kein Pin-Ziel mehr | nicht für Shell nutzen |

- Release (automatisch): `dev` committen und pushen. Nach grünem Check promotet `automerge.yml` nach `master` und startet den Live-Deploy. Direkte Pushes auf `master` vermeiden; Hotfixes über `dev`.
- Shell: `vos-release` / `vos-ship` pinnt `origin/master` (detached im `*-app`) und bumpt den Meta-Pointer → `deploy-shell.yml`. Vorher `vos-overview`.
- `.gitmodules` im Meta-Repo: `branch = master`. Kein Auto-Vorspulen eines App-Branches `vitalos` mehr.
- Parallel-Branches/Worktrees nur mit Owner-Ausnahme.
- Default-Branch des Repos ist `master`; die Workflows auf `master` bestimmen das Live-Verhalten.
<!-- release-weg:end -->

## Plan ownership and Coach consumption (2026-11-09)

Plan ist die Brücken-UI (geteilter Editor, Versionierung, Feedback). Coach hostet
die Schmiede für Klientenpläne und das lokale Backend (`coach_local_plans` lädt
heute noch `modules/plan/runtime` — Umzug nach Coach ist offen). Fitness zeigt
denselben Plan-Tab für den Klienten, ohne Coach-Imports.

Change shared UI here, commit, then deliberately advance Coach's `modules/plan`
pointer. Publish Plan commits before pushing a Coach pointer referencing them.
Kein zweiter Editor in Coach; kein Local-Backend-Ausbau in plan-dev.

Planbezogene Empfangsbestätigung und Feedback: `src/views/Plan/components/PlanFeedback.jsx`;
Vertrag: [docs/PLAN-FEEDBACK.md](docs/PLAN-FEEDBACK.md). Rules-Owner: VitalOS.

**Keine Dynamic Imports** (Owner 2026-11-10, gilt auch weil Fitness diesen Code
einbindet): kein `React.lazy` / `import()` für Views oder API — immer statisch.
Sonst stirbt der Plan-Tab in Fitness am Vite-Preload-Marker.

## Org-Taskwarrior (global) — gilt fuer alle Agenten der VitalOS-Org

Verbindlich fuer alle Agenten (Vibe, Claude, Codex, Gemini) in Org-Kontexten
(Owner-Weisung 2026-11-07):

1. EINE globale Org-Task-DB — KEINE eigenen Rollen- oder Repo-DBs mehr:
   `TASKRC=~/.local/state/vitalos-org/taskrc` (DB liegt daneben in `task/`).
   Alte Repo-DBs sind archiviert unter `~/.local/state/vitalos-org/archive-repodb/`.
2. Daniels private Taskwarrior-DB (`~/.task`, u. a. Hotlist `+hot`) bleibt
   TABU fuer Schreibzugriffe — nur lesend (CEO-Runde: Task `status:pending +hot`).
3. Rolle = Tag: Jeder Agent taggt seine eigenen Aufgaben mit seiner Rolle:
   `+ceo`, `+cto`, `+al`, `+pm`, `+alpha`, `+betta` …
4. Abteilung/Repo = project: `project:fitness-dev`, `project:journal-dev`,
   `project:vitalos-prod`, `project:dotfiles`, `project:aos` …
5. Prio-Encoder (in der Org-taskrc verankert):
   - `+hit` und `+br` sind EIN Tier (Hits = Big Rocks, Koeffizient 8.0) —
     hoechste Dringlichkeit, `+hit` = `+br`.
   - `+lr` 2.0 (Little Rocks).
   - `+hot` 1.0 — NUR Potential/Sichtbarkeit, wird NIE automatisch ausgefuehrt;
     ob ein Potential jetzt anfaellt, entscheidet der Door War (Sonntagsrunde).
   - `+s` -1.0 (Sand, Zeitverschwendungsroutine).
   - `+go` ist KEINE Prioritaet und bewirkt nichts — Freigaben laufen ueber
     die Rollen (CTO-Freigabeprozess), nicht ueber Urgency.
6. Aufgaben IMMER per UUID anfassen (`task <uuid> modify|done|info`), NIE per
   ID — IDs renummerieren sich nach jedem `done` (Fehltreffer-Gefahr).
7. Guard: orgsh und die Runner verweigern den Lauf, wenn die Org-taskrc fehlt —
   kein stiller Rueckfall auf die Privat-DB.
8. Uebersicht/Rang: `TASKRC=~/.local/state/vitalos-org/taskrc \
   ~/.org/venv/bin/python ~/aos/bin/aos door plan quadrants --json`
   (Eisenhower-Sicht Q1–Q4).
