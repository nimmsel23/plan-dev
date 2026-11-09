# FRAME — plan-dev

Stand: 2026-11-09. Ehrliche Bestandsaufnahme (Repo + App), kein Wunschdenken.

## Was ist das?

| | |
|---|---|
| **Rolle** | Brücke Fitness↔Coach — geteilter Plan-/Editor-Code („Fitness-Code für Coach“) |
| **Repo** | `~/dev/plan-dev` → `nimmsel23/plan-dev` |
| **Branch** | `dev` @ `3fd427b5` — sync mit `origin/dev` |
| **Pkg** | `plan` 3.0.0 |
| **Nicht** | eigenes Local-Backend, Catalog-Python, Schmiede-Betrieb |

## App / Oberfläche

- Plan-Editor, ProgramEditor, RoutineBuilder, TrainingPlans, PlanFeedback
- Als Miniapp/Overlay in Fitness; als `modules/plan` Pin in Coach
- Yuhonas-Pin speist den **Atlas-Mirror** (aktive DB → IndexedDB am Gerät);
  Expert-KB bleibt `kb/exercises` (Inbox-Gate) → Build-JS
- Mehrgerät: `resolveStart`, `expectedUpdatedAt`, Konflikt-UI (Nov 2026)

## Backend / Daten (bewusst fremd)

| Braucht | Liegt bei |
|---|---|
| YAML-KB | `~/dev/fitness` (nicht hier) |
| API :9150 / Schmiede | `coach-dev` |
| Klient-Logging | `fitness-dev` → Firestore |
| Node/Hono | `~/dev/backend` (kein Plan-Pflichtbackend) |

## Repo-Zustand

- **Sauber gepusht** auf `origin/dev` (Breakthrough in `ARCHITECTURE.md`)
- Untracked Restarchive: `archive/6pack-kopie-2026-11-06/`,
  `archive/fitness-kb-kopie-2026-11-06/` (nicht committen nötig)
- Fork-Schuld archiviert: `archive/fitness-fork-schuld-2026-11-09/`
  (kaputte `catalog`/`fitness_cli`, `fitnessctl*`)
- `fitness.ref` bleibt am Root (CI Overlay-Pin auf fitness-dev Stand)
- Noch im Tree (nicht ausbauen): `runtime/`, alembic-artige Reste → Ziel Coach

## Release

`dev` → `master` (CI automerge) → Shell via `vos-release plan`.
Coach-Pointer (`modules/plan`) bewusst bumpen — kein Auto-Bump.

## Offen / Drift

- Fork-Backend-Reste weiter nicht füttern
- Coach-Submodul-Pin (`modules/plan`) kann hinter `plan-dev/dev` liegen —
  Pointer-Hygiene bei Plan-Releases prüfen
- Große Archive unter `archive/` aufräumen oder `.gitignore`n

## Ein Satz

Plan liefert den Vertrag und den Editor; Laufen und Schmieden machen Fitness und Coach.
