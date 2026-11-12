# View Architecture: Settings (Hybrid Control)

## Purpose
Manages user preferences and system configuration. Unified aesthetics with environment-specific power.

## Features
- **Theme System**: Full access to 36+ AlphaOS themes (Nordic, Dracula, Honey, etc.), now fully modularized.
- **Mobile Navigation**: Toggle between "Tabs" (classic bottom bar) and "Home Menü" (Hub & Sheet architecture).
- **Training Logic**: Toggle for `Volume Mode` (Sets/Reps tracking) vs `HIT Mode`.
- **Coach Intelligence (Local Only)**: 
    - Port checks for `fitness-dev` and `wger`.
    - Manual Firestore Sync trigger.
    - System path information (~/.aos/fitness/).

## Logic
- Consumes and updates settings via `db.js` (`getSettings`, `saveSettings`).
- Local version maps these to `localStorage` (via `user.js` lib).

## Destillat aus der RESULTS.md (2026-11-12)

Kurzfassung dauerhaft relevanten Wissens aus dem früheren Arbeitslog, thematisch einsortiert vom thin-results-Dienst.

## Themes und Settings-Module (Stand Umbau)

- Entfernt wurden: sweet, sweet-purple, sweet-mars, sweet-amber-blue, slate, zinc, snow, mint, rose, gold, cyan.
- Neu: Kanagawa, Everforest, Oxocarbon, Paper.
- Korrigiert wurden Gruvbox, Solarized (beide Varianten), Homunculus, Nothing (reines Monochrom) und Midnight.
- Der Settings-Tab ist modular aufgeteilt:
  - `AppearanceSection`: Themes, Circadian, Layout-Skalierung, Geschlecht.
  - `TrainingSection`: Split, Zykluslänge, Standort, Highlighter-Modus (`body` oder `react-muscle-highlighter`).
  - `LocalDevSection`: lokale Endpunkte und Sync-Konfiguration.
