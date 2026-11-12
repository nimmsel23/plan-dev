# Fitness Centre

Workout-Tracking PWA und CLI für Krafttraining — Pflichtaufgaben-Werkzeug der Diplom Präventiver Vitaltrainer Ausbildung (Fitnesstrainer-Modul, Health Personal Fitness Trainer, Prävention).

**Ziel:**
- Praktisches Werkzeug zur Unterstützung der Ausbildung: Trainingspläne erstellen, Logs führen, Anatomie-Lehre dokumentieren
- Offline-fähiges Workout-Logging ohne externe Apps
- Strukturierte Trainingspläne mit vollständig integriertem wger Backend (lokal) + yuhonas Ergänzung
- Lokale, file-basierte Speicherung unter `~/.aos/fitness/`
- Anatomie Teaching Layer für echte Trainer-Ausbildung (Ursprung, Ansatz, Innervation, Coaching-Cues)
- Firebase PWA unter `fitness-aos.web.app` für mobiles Logging

**Vollständige technische Dokumentation:** [CLAUDE.md](./CLAUDE.md)

---

## System: fitness-agent (Prophet) + fitness-dev (Tempel)

**fitness-agent** (Skill) — Katalog-Manager:
- Liest Fitnesstrainer-Module der Ausbildung
- Schreibt & erweitert Katalog in `~/fitness-dev/catalog/` (YAML: Exercises, Anatomy Teaching, Rules, Mappings)
- Schreibt Tickets für fitness-dev-coding-agent wenn Features/Gaps sichtbar werden
- Silent DB-Manager: Anatomie-Lehre, Katalog-Normalisierung, Quellen-Integration

**fitness-dev** (dieses Repo) — Backend + Frontend, gebaut von fitness-dev-coding-agent:
- Backend (`server.mjs`, `fitness-runtime.mjs`): API für Session-Logs, Pläne, Coverage-Analyse
- Frontend (React + Vite): Workout-Logging, Trainingsplanung, Anatomie-Ansicht, Muskelabdeckungs-Analyse
- Firebase PWA (`pwa/`): mobiles Logging direkt in Firestore, kein lokaler Server

---

## Stack

| Schicht | Technologie | Port |
|---------|-------------|------|
| Backend | Node.js (`server.mjs`) | 9100 |
| Frontend | React + Vite | 5902 (dev) |
| PWA | Firebase Hosting | fitness-aos.web.app |
| Exercise DB | wger (lokal, derzeit gestoppt) | 80 |
| Ergänzung | yuhonas free-exercise-db | — |

---

## Python Environment (uv)

Dieses Projekt nutzt [uv](https://github.com/astral-sh/uv) für performantes Python-Paketmanagement.

```bash
uv sync                  # Virtual Environment erstellen & Abhängigkeiten installieren
uv run fitness-agent     # CLI-Tool ausführen
uv run ./fitnessctl      # Ecosystem Management (API, UI, Watcher)
```

---

## Commands

```bash
npm run dev          # Backend (9100) + Vite DevServer (5902) mit HMR
npm run ui:dev       # Nur Vite DevServer
npm run build        # Production-Build → dist/
npm run build:catalog  # Katalog → ~/.aos/fitness/workouts/catalog.json

python -m catalog.catalog audit       # Katalog-Qualität prüfen
python -m catalog.catalog kb-sync     # catalog/kb → Firestore
bin/firestore-sync pull                     # Firestore → ~/.aos/fitness/
```

---

## Daten

```
~/.aos/fitness/
├── sessions/        YYYY-MM-DD.json — Session-Logs
├── journal/         YYYY-MM-DD.md — Text-Notizen
├── body/            YYYY-MM-DD.json — Körpermessungen
├── plan.json        Aktiver Trainingsplan
└── theme.json       UI-Präferenz
```

---

## Dokumentation

| Dokument | Inhalt |
|----------|--------|
| [docs/FIREBASE.md](./docs/FIREBASE.md) | Firebase-Live-Release, `vitalos/fitness-app`, lokale `.local -> /opt` Deploy-Kette |
| [CLAUDE.md](./CLAUDE.md) | API-Referenz, Katalog-Struktur, Session-Format, Design-Patterns |
| [FIRESTORE.md](./FIRESTORE.md) | Firebase/Firestore Sync-Architektur |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technische Architektur, Datenquellen |
| [VISION.md](./VISION.md) | Richtung, Volume Landmarks, Anatomie Teaching Layer |
| [ROADMAP.md](./ROADMAP.md) | Feature-Roadmap |
| [AGENTS.md](./AGENTS.md) | Agent-Workflow |

Kurz zu den Invarianten:
- localhost/Desktop kommt aus `~/fitness-dev`
- Firebase-Live-Release kommt aus `vitalos/fitness-app`
- `@vos/cross-app-aliases` und die lokale `.local -> /opt`-Kette sind Teil des
  funktionierenden Setups und kein austauschbares Detail

---

## Status

- ✅ Backend + API (Node.js, Port 9100)
- ✅ Frontend Views (Dashboard, Session, Journal, Muscles, Learn, WeeklyReview)
- ✅ Firebase PWA (fitness-aos.web.app) — Firestore-basiert, kein lokaler Server
- ✅ Firestore Sync (on-demand pull via Bridge-Ping, Oneshot beim Boot)
- ✅ wger Integration vorhanden, aber Stand 2026-08-30 bewusst gestoppt da aktuell nicht als aktives Backend genutzt
- ✅ yuhonas Integration (Bilder, Varianten)
- ✅ Katalog-Struktur (Exercises, Anatomy Teaching, Rules, Maps)
- ✅ BodyMap (react-body-highlighter) — Muskelvisualisierung in Session + Coverage-View
- ✅ Gmail-Pipeline (`bin/fitness-mail`)
- ✅ `fitness` CLI (Python/Typer) via `fitnessctl`
- ⏳ Anatomie-Lehre für alle Übungen
- ⏳ PWA Offline-Unterstützung

## Destillat aus der RESULTS.md (2026-11-12)

Kurzfassung dauerhaft relevanten Wissens aus dem früheren Arbeitslog, thematisch einsortiert vom thin-results-Dienst.

## Commands: CLI-Stand (2026-09-08 bis 2026-09-09)

- `fitness-log` ist die Konsole für Kraft: `show`, `add` (mit `--effort`/`--rpe`, `--location`, `--duration`) und `wizard`. Cardio läuft über `fitness activity log`.
- `fitness coach log-client-workout` loggt Klienten-Workouts (Klienten-Workspace `~/Klienten/<id>/`). Der Befehl lag früher unter `runtime/` bzw. `catalog/`.
- `fitness-strength` ist in `fitness-log` aufgegangen. `fitness/commands/` ist aufgelöst. Jedes Modul ist ein Subpackage (`log/`, `tui/`, `activity/`, `mail/`, `sync/`). Der Entry-Point liegt in `bin/fitness-log`.
- `fitness/runtime/session_store.py` ist der zentrale Session-Resolver (`session_path`, `iter_session_files`, `user_dirs`). Lege Session-Pfade nicht mehr selbst an.
- `fitness/muscles.py`: `muscle_label()` liefert echte KB-Muskelnamen. Grobe Buckets nur für Gruppenansichten.
