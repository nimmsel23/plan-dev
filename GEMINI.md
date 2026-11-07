# AlphaOS Fitness Ecosystem — Project Instructions

This document serves as the foundational mandate for the development and maintenance of the AlphaOS Fitness ecosystem. It defines the architectural vision, engineering standards, and the "big picture" of the multi-tenant coaching platform.

## 1. Vision & Big Picture
A unified fitness ecosystem serving two primary roles:
1.  **Clients (PWA)**: An "always-on" mobile-first front door for fitness logging, habit tracking, and learning, powered by Firebase.
2.  **Coach (Localhost)**: A professional command center for analysis, client management (EspoCRM), exercise curation (wger), and AI-driven content enrichment.

## 2. Core Architecture

### Frontend: Firebase PWA (`/pwa`)
*   **Tech Stack**: React, Tailwind CSS, Lucide Icons, Recharts.
*   **Authentication**: Google Auth / Email-Password via Firebase Auth.
*   **Persistence**: Multi-tenant data structure in Firestore (partitioned by User UID).
*   **Aesthetics**: "AlphaOS" design language—Glassmorphism, high density, JetBrains Mono for data, and consistent 15+ themes (Nordic, Dracula, etc.).
*   **Desktop Mode**: Fixed sidebar navigation (`lg` breakpoint), responsive 3-column dashboard, and side-by-side split views for learning/journaling.

### Backend (`server.mjs`)
*   **Local Server**: Hono-based Node.js server (`server.mjs`) used strictly for local development and local tool integration. In production (Firebase build), the frontend communicates directly with Firestore and no intermediate backend is used.

### Integration Points
*   **3-Tier Exercise Catalog**: 
    - **Expert Tier**: Curated indices and deep detail files.
    - **Bulk Layer**: 1850+ unreviewed exercises (wger/yuhonas).
    - **Lab (Inbox)**: AI-powered staging area for elevation.
*   **wger**: Master database and ID source for muscle normalization.
*   **Anatomy-KB**: Source for deep biomechanical facts and `anatomy` teaching data.

## 3. Engineering Standards

### Biomechanical Integrity
*   **Auditor Compliance**: All approved exercises must pass the biomechanical consistency check (correct muscles for given patterns).
*   **Normalization**: Always use wger-mapped IDs from `muscles.yml` for muscle associations.

### Data Flow
*   **Expert-Wins Sync**: The `kb_sync` pipeline ensures Tier-1 data (Expert) always overwrites Tier-2 data (Bulk) in Firestore.

### CSS & Styling
*   **Tailwind Namespace**: Use the `fit` namespace (e.g., `text-fit-accent`, `bg-fit-card`) to map directly to project-wide CSS variables.
*   **Theme Parity**: Ensure any UI changes support the full theme list defined in `pwa/src/App.jsx`.
*   **Density**: Maintain root project spacing standards (`1rem` / `1.25rem` padding/radii) to ensure professional visual consistency.

### Component Logic
*   **Strength vs. Cardio**: Automatically distinguish between strength sessions (exercise counts) and cardio/activities (duration/icons).
*   **Heatmaps**: Use rolling 10-day (Dashboard) and 28-day (Habits) views instead of fixed ISO weeks for better recency focus.

### Data Flow
*   **Local-First / Cloud-Synced**: Local saves should dual-write to SQLite/JSON and mirror to Firestore when connected.
*   **Bridge Triggering**: Use Firestore collections as asynchronous bridges between mobile clients and local coach tools.

## 4. Repository Structure
*   `/pwa`: The Firebase-deployed React application.
*   `/src`: Local development views and components (parity targets).
*   `/catalog/kb`: The local knowledge base for anatomy and exercises (YAML).
*   `/arena`: Specialized muscle visualization/gamification module.

## 5. Development Workflow
1.  **Edit PWA**: Implement features in `/pwa`.
2.  **Sync Parity**: Update corresponding components in `/src` to maintain the local-development target.
3.  **Deploy**: Use `npm run deploy --prefix pwa` for Firebase Hosting updates.
4.  **Anatomy Parity**: When adding exercises, ensure deep anatomy is enriched in `~/anatomy-kb` and passes `./anatomy-agent audit all` before syncing to Firestore. Use the `anatomy-agent` skill for deep knowledge ingestion.
5.  **Data Persistence**: Local dev uses `server.mjs` (SQLite/JSON). Prod uses direct Firebase SDK access.
6.  **Document**: Update this `GEMINI.md` when architectural shifts occur.

## 6. Future Roadmap & Experiments
*   **Anatomy Learning**: Integrating `body-muscles` (70+ regions) into the `Learn` view for deep anatomical education and interaction.

## 7. Document History
*   2026-07-25: Enabled Dual-Frontend serving in FastAPI backend (`fitness/api/main.py`), serving the main SPA at `/` and the isolated `catalog-ui` at `/catalog-ui`. Refactored catalog `aliases.py` auditor to directly audit `german`, `english`, and `aliases` fields from index `ExerciseRecord`s.
*   2026-06-12: Fixed bugs in `catalog/server.py` and `kb_sync.py`. Updated documentation to reflect `react-muscle-highlighter` integration and finalized `data/` directory location.
*   2026-05-28: Integrated `react-muscle-highlighter` in `Muscles` tab (detailed view) with toggle support. Retained `react-body-highlighter` for dashboard.


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
