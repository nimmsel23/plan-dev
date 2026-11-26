# Workout-Templates per Agent anlegen

Einstieg: [Generator-Anleitung](WORKOUT-GENERATOR.md). Alle Vorlagen leben in
`src/views/Plan/data/workoutTemplates.json`; CLI und UI-Picker lesen dieselben Daten.

## Gemeinsamer Auftrag für alle Template-Prompts

Diesen Block vor einen der folgenden Aufträge setzen:

```text
Arbeite in /home/alpha/dev/plan-dev auf dev. Lies AGENTS.md und
src/views/AGENTS.md sowie docs/WORKOUT-GENERATOR.md. Prüfe git status und
bewahre fremdes WIP. Sichere bestehende Dateien vor Edits.
Ergänze workoutTemplates.json, keine zweite Vorlagenliste im CLI oder UI.
Nutze echte yuhonas_id aus dem gepinnten vendor/free-exercise-db/exercises;
prüfe Quelldatei, Muskeln, Geräte und Ausführung. Interne exercise_id und
JSON-Schlüssel sind nicht automatisch die Vendor-ID.
Nutze routines[].day und routines[].exercises; ein Platz hat entweder
exercise oder selector und role main|compound|isolation. main steht zuerst
und ist ein Compound; maximal ein main pro Einheit. Alle Selector-Alternativen
müssen zur Rolle und zum benötigten Equipment passen.
Gib benötigte Geräte ehrlich an; Equipment-Flags tauschen keine Übungen aus.
Prüfe defaultLevel, cycleDays, compoundPolicy, goal, equipment und notes.
Optional defaultCore: posture|6pack|mobility|none; --core überschreibt es.
Erhalte bestehende IDs und gespeicherte Pläne. Keine erfundenen Lasten.
Führe npm run test:generator aus, prüfe --list und PLAN_PRESETS sowie einen
Plan je Level und npm run build:firebase:plan. Prüfe im angemeldeten Editor,
falls eine Sitzung verfügbar ist; sonst die offene UI-Abnahme benennen.
Dokumentiere Änderungen in WORKOUT-GENERATOR.md und bei Strukturänderungen
ARCHITECTURE.md/AUDIT.md. Ergänze das lokale ignorierte RESULTS.md und NEXT.md.
Committe nur zugehörige Dateien auf dev. Kein Shell-Pin/Meta-Pointer-Bump.
```

## A — Schulter und Nacken / Prävention

```text
Lege das Template vital-shoulder-neck an (falls vorhanden: prüfen und gezielt
verbessern, kein Duplikat): Schulter & Nacken Vital, goal vitality,
2 Einheiten an Tag 1 und 4 eines 7-Tage-Zyklus, defaultLevel beginner,
Kurzhanteln und Eigengewicht, defaultCore posture.
Zielgruppe: Erwachsene mit sitzendem Alltag. Nutze vorhandene passende
Katalogübungen für Druck, Zug, Schultergürtel und Rumpf.
Beschreibe es als bearbeitbaren Präventionsentwurf; keine Heilversprechen
oder pauschale Eignung als Rehabilitationsplan. Individuelle Beschwerden
sind kein Bestandteil eines allgemeinen Templates.
```

## B — Kettlebell und Eigengewicht

```text
Lege kettlebell-vital an (falls vorhanden: prüfen und gezielt verbessern):
goal home, 3 Ganzkörpereinheiten an Tag 1, 3 und 5,
defaultLevel intermediate, defaultCore posture.
Geräte: Kettlebells UND Kurzhanteln plus Eigengewicht, soweit die konkreten
Vendor-Übungen sie benötigen. Kein falsches dumbbell-only-Versprechen.
Nutze passende vorhandene Kraftübungen. Beschreibe die tatsächliche
Satz-/Wiederholungsstruktur; behaupte keinen Timer-Zirkel oder automatische
Conditioning-Dosierung, solange der Generator das nicht unterstützt.
```

## C — Klientenentwurf aus vorhandenem Template

```text
Generiere einen bearbeitbaren Trainingsplan-Entwurf für Raphael:
Vitalität und Haltung, 3 Einheiten, intermediate, Kurzhanteln.
Prüfe zuerst --list und die konkrete Übungsauswahl. goal/equipment/days
sind Auswahlhilfen, kein kombinierter Equipment- oder Frequenzfilter.
Wähle daher ausdrücklich das passende Template und notwendige --variant
Optionen. Prüfe jeden ausgegebenen Übungsplatz auf Gerätebedarf.
Erzeuge Markdown mit --output /tmp/Raphael-Plan.md. Vorhandene Datei nicht
überschreiben. Keine Klientenzuweisung und kein Versand.
Berichte Template, Rhythmus, Geräte und eventuell nötige Anpassungen.
```

## D — Freier Template-Auftrag

```text
Neues Template:
- ID und Name: <eindeutig>
- Ziel: <vitality|home|hypertrophy|mobility>
- Zielgruppe und Trainingsabsicht: <konkret>
- Tatsächlich verfügbare Geräte: <Liste, inklusive Bank/Kabelzug falls nötig>
- Trainingstage im Zyklus: <z. B. 1, 3, 5>; cycleDays: <7 oder rollierend>
- defaultLevel: <beginner|intermediate|advanced>
- defaultCore: <posture|6pack|mobility|none>
- Gewünschte Bewegungen und Grenzen: <konkret>
Prüfe zuerst, ob ein bestehendes Template oder Varianten genügen.
```

## Tatsächliches JSON-Schema: kompaktes Beispiel

```json
{
  "id": "example-two-day",
  "name": "Beispiel · 2 Tage",
  "goal": "vitality",
  "equipment": ["dumbbell", "bodyweight"],
  "defaultLevel": "beginner",
  "defaultCore": "posture",
  "aliases": [],
  "cycleDays": 7,
  "compoundPolicy": "mixed",
  "notes": "Bearbeitbarer Entwurf.",
  "routines": [
    {"day": 1, "label": "A", "exercises": [{"exercise": "db-row", "role": "main"}]},
    {"day": 4, "label": "B", "exercises": [{"exercise": "press", "role": "main"}]}
  ]
}
```

Das Beispiel zeigt die Struktur, keinen vollständigen Trainingsplan. Frequenz,
`cycleDay` und `weekdays` werden aus den Routinen abgeleitet. `slots`, Slot-`kind`,
Template-`trainingDays` und manuelle `weekdays` gehören nicht in dieses Schema.
Tests prüfen technische Konsistenz und Katalogquellen; die fachliche Eignung und
vollständige Geräteverträglichkeit aller Kombinationen müssen zusätzlich geprüft werden.
