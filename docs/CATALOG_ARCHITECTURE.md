# Fitness PWA: Catalog & Firestore Architecture

Dieses Dokument beschreibt die Architektur der Exercise-Datenbank, den Indexing-Mechanismus und den proaktiven Expert-Daemon.

Der konkrete Inbox -> AI-Enrichment -> Coach-Review -> Expert-Approval Flow ist in
[`EXERCISE_CATALOG_FLOW.md`](EXERCISE_CATALOG_FLOW.md) festgelegt. Diese Flow-Regel
gewinnt gegen ad-hoc Reparaturen an `unreviewed_*` oder Inbox-Drafts.

## 1. Multi-Tier Datenstruktur (The 3-Tier Model)
Um Skalierbarkeit ohne Qualitätsverlust zu garantieren, nutzt das System drei Ebenen:

- **Tier 1: Expert-Tier (The "Coach Brain")**: 
  - **Index**: Registry-Files (z.B. `chest.yml`) mit IDs und wger-normalisierten Muskel-Mappings.
  - **Details**: Expert-Detail-Files (z.B. `exercises/bench_press.yml`) mit Coaching-Notes und Biomechanik.
  - **Status**: Manuell geprüft, autoritativ.
- **Tier 2: Bulk Staging Layer (The "Wiki")**:
  - Großvolumige Importe (~1850 Übungen) aus `wger` und `yuhonas`.
  - **Status**: Markiert als `unreviewed`. Dient als Daten-Fallback für die PWA.
- **Tier 3: Inbox (The "Lab")**:
  - Temporäre Drafts (`inbox_*.yml`) für Neuanfragen oder KI-veredelte Wiki-Daten.

## 2. Der Autonome Expert-Daemon (`fitness-agent watch`)
Der `fitness-agent` agiert als intelligenter Hintergrundprozess mit folgenden proaktiven Zyklen:

### A. Demand-Driven Refinement (Usage Priorisierung)
- **Log-Ingestion**: Der Daemon importiert synchronisierte Sessions in eine lokale SQLite-Historie.
- **Mining**: Er analysiert die Nutzung der letzten 28 Tage.
- **Proaktives Drafting**: Meistgenutzte `unreviewed` Übungen werden automatisch via Gemini veredelt und als Expert-Draft in die Inbox gelegt.

### B. Biomechanischer Auditor (Continuous Auditing)
- **Validation**: Prüft den gesamten Katalog gegen das Regelwerk in `rules/biomechanics.yml`.
- **Logic-Checks**: Stellt sicher, dass Bewegungsmuster (z.B. `horizontal_press`) zu den primären Muskeln passen.
- **Reporting**: Erzeugt eine "Coach-To-Do-Liste" für Datenkorrekturen.

### C. Context-Aware AI Enrichment
- Nutzt spezialisierte Prompts für **neue** vs. **bestehende** (Wiki) Übungen.
- Verwendet bestehende Metadaten als Kontext, um Konsistenz bei der Veredelung zu garantieren.

## 3. Smart Approval Workflow
Der `approve`-Befehl überführt Daten sicher von Tier 3 (Lab) in Tier 1 (Expert):
1.  **Registry-Eintrag**: Schreibt Core-Metadaten in den regionalen Index.
2.  **Expert-Storage**: Speichert die volle Intelligenz als Detail-File.
3.  **Tag-Update**: Entfernt `unreviewed` und markiert die Übung als verifiziert.

## 4. Sync & Merge Pipeline (`kb_sync.py`)
Die Cloud-Synchronisation folgt dem **Expert-Wins-Prinzip**:
- **Aggregation**: Sammelt alle Datenquellen.
- **Intelligenter Merge**: Bei ID-Kollisionen überschreiben Tier-1-Daten (Expert) immer die Tier-2-Daten (Wiki).
- **Smart Sync**: Nutzt MD5-Hashing des Inhalts, um nur geänderte Dokumente an Firestore zu senden. Dies schont das Quota-Limit und beschleunigt den Prozess drastisch.
- **Orphan Cleanup**: Löscht automatisch Dokumente in Firestore, die lokal nicht mehr existieren (z.B. nach ID-Umbenennungen).
- **Output**: Ein konsolidierter Datensatz pro Übung in Firestore.

## 5. Muskel-Normalisierung (`muscles.yml`) & ID-Konvention
Zentraler Index aller Muskeln mit **wger-IDs**. 

### ID-Konvention: Prefixed Slugs
Seit Juni 2026 verwenden alle Muskel-IDs im Katalog das Format `XXX_slug` (z.B. `101_pectoralis_major`).
- **Vorteil**: Vermeidung von Namenskollisionen bei regionalen Unterteilungen (z.B. verschiedene Köpfe eines Muskels).
- **Vorteil**: Eindeutige Sortierung und schnellere Identifizierung im Code.
- **Wichtig**: Der PWA-Frontend-Code muss diese IDs als "Canonical Slugs" behandeln und bei Bedarf (Icons, Übersetzungen) das Präfix ignorieren oder gezielt mappen.

---
*Dieser proaktive Ansatz stellt sicher, dass der Katalog organisch mit den Bedürfnissen der Nutzer wächst, während das "Expert Brain" die volle biomechanische Kontrolle behält.*

## Destillat aus der RESULTS.md (2026-11-12)

Kurzfassung dauerhaft relevanten Wissens aus dem früheren Arbeitslog, thematisch einsortiert vom thin-results-Dienst.

## Inbox-Drafts: ID-Referenz statt Kopie (2026-09-08 bis 2026-09-09)

- Inbox-Drafts verlinken wger- und yuhonas-Quelle nur über IDs (`wger_id`, `yuhonas_id`, `external_ids`). Es gibt keine Text-Kopie und kein `source_snapshot` mehr. Rohdaten werden live über `find_source_entries()` gelesen. Das Coach-Sheet zeigt sie im Abschnitt „Quellen“, getrennt und nie gemergt.
- Kein automatisches Feld-Merge wger↔yuhonas. Das ist Nutzervorgabe. Merge-Kandidaten werden nur mit Score angezeigt (`merge_candidates.py`), nicht automatisch verlinkt.
- Erzeugung: `create_inbox_draft()` legt nur ID-Referenzen an (explizit per `--wger-id`/`--yuhonas-id` oder per Auto-Match). CLI: `fitness-catalog new-draft`, `fitness-catalog find-source <name>`. `find-source` durchsucht beide Quellen. Ein wger-only-Grep übersah „Bent Over Barbell Row“.
- Matching: `_match_norm()` (Geräte-Präfix, Singular/Plural) gilt nur für den wger↔yuhonas-Vergleich in `_best_match`. Die globale Schwelle `AUTO_MATCH_MIN_SCORE` 86 bleibt unverändert.
- Fuzzy-Gate: Mindestens ein nicht-generisches Wort muss übereinstimmen (`fuzzy_candidate_allowed`, `GENERIC_FUZZY_TOKENS`). Sonst entstehen Fehltreffer wie „Jefferson Curl“ zu „Cable Curls“ mit Score 100.
- Der externe Seed normalisiert Muskelfelder über `normalize_exercise_muscle_list()`. Grobe Regionen wie `shoulders` fallen bei Nichtmatch weg (`refine_generic_region_labels`).
- Suche: `GET /exercises/search` zeigt unreviewed- bzw. bulk-Treffer nur als Fallback, wenn kein Expert- oder Inbox-Treffer existiert.
- Freigegebene Einträge (`review_state.status: approved`, `source: expert`) gehören nach `kb/exercises/`, nicht nach `kb/inbox/`.
- Muskel-Taxonomie: Trapezius `202` ist Parent mit Kindern `202a/b/c`. Hamstrings `604` ist Parent mit Kindern `604a/b/c`. Das folgt dem Muster Trizeps, Quadrizeps, Gastrocnemius. Kinder tragen `parent:`. Aliase in `muscle_index.yml` (`string_aliases`): forearms, glutes, hamstrings, lower_back, middle_back, traps.
- Audit: `fitness-catalog audit source-consistency` prüft Inbox-Muskeln gegen die Rohquellen. Die Funktion nimmt einen `record`-Parameter statt eines globalen `lru_cache`. Ein Cache hätte in `fitness-api` veraltete Daten geliefert.
- Coach-Inbox: `POST /fitness/inbox/{id}/link-source` setzt IDs und `origin`. Reenrich behält bestätigte Provenance-Felder.
- TUI: strukturierter Feld-Editor (`tui.py`, `_edit_exercise_interactive`). Vorher wird eine `.bak` angelegt.
- Das Auto-Attach von Quellen (`attach-sources`) läuft standardmäßig als Dry-run. Zum Schreiben ist `--apply` nötig.
