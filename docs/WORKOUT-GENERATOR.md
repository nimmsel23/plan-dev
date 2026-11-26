# Workout Generator

`bin/plan-generate` erzeugt aus Name, Level und JSON-Vorlagen einen bearbeitbaren
Coaching-Entwurf. Er speichert keine Kontodaten, loggt kein Training und weist
keinen Plan zu. CLI und bestehender App-Picker verwenden dieselbe Datenquelle:
[`workoutTemplates.json`](../src/views/Plan/data/workoutTemplates.json).

```sh
./bin/plan-generate Daniel --level advanced
./bin/plan-generate Maria --goal vitality --level beginner --days 2
./bin/plan-generate Thomas --equipment dumbbell --level intermediate --days 3
./bin/plan-generate Anna --template bodyweight-vital --level beginner
./bin/plan-generate Maria --goal balance --equipment balance --level beginner
./bin/plan-generate Maria --template strength-stability --equipment dumbbell,stable-support --level intermediate
./bin/plan-generate Daniel --template five-two-legs --level advanced \
  --variant chest-press=incline-bb --variant hinge=sumo
./bin/plan-generate Daniel --level advanced --format json
./bin/plan-generate Daniel --level advanced --format yaml
./bin/plan-generate Daniel --level advanced --output /tmp/Daniel-5x5.md
./bin/plan-generate --list --format json
```

Außerhalb des Repos: `/home/alpha/dev/plan-dev/bin/plan-generate …`.
Neue interaktive Shells nehmen `~/dev/*/bin` über die vorhandene PATH-Konfiguration auf.
Alternativ im Repo: `npm run plan:generate -- …`.

## Auswahlvertrag

Ziel, Geräte und Trainingstage gelten **gemeinsam**, auch bei explizitem Template.
Ohne Treffer: Exitcode 2, Erklärung und nahe Alternativen mit Abweichungen auf
stderr; stdout bleibt leer. Vorgaben werden nicht automatisch gelockert.
Explizite Varianten müssen im gewählten Template vorkommen und zum Geräterahmen
passen. Nur freigegebene Selector-Alternativen dürfen genau einen Platz ersetzen.

`--days 2|3|4|5|6` bedeutet Einheiten pro **Sieben-Tage-Woche**. `ppl-six` ist
weiter ein Acht-Tage-Zyklus, explizit ohne widersprechendes `--days` wählbar.

Unter passenden Vorlagen priorisiert der Generator Ziel-Default, Equipment-Default,
Level-Default, passendes Standardlevel und schließlich Katalogreihenfolge.
Ohne Vorgaben bleiben Beginner → Ganzkörper, Intermediate → PPL,
Advanced → 5er mit zwei Beintagen erhalten.

Level ist keine automatische Prüfung der persönlichen Eignung.

## Geräte: verfügbar, erforderlich und zusätzlich

| Profil | Verfügbar |
| --- | --- |
| `gym` | Studio mit KH/LH/KB, Maschinen, Kabel, Bank, verstellbarer Bank, Rack, Klimmzugstange, fester Haltemöglichkeit |
| `dumbbell` | Kurzhanteln, Eigengewicht, Matte; **keine Bank** |
| `bodyweight` | Eigengewicht, Matte; keine Klimmzugstange oder anderen Hilfsmittel |
| `kettlebell` | Kettlebells, Eigengewicht, Matte |
| `balance` | Eigengewicht, Matte, feste Haltemöglichkeit |

Für genaue Inventare sind kommagetrennte Geräte möglich, etwa
`--equipment dumbbell,bench` oder `dumbbell,stable-support`. Eigengewicht und
Matte sind bei solchen Inventaren die Basis; zusätzliche Geräte werden nicht
vermutet. Alle Gerätebegriffe stehen in `--list`.

- `exercise.equipment`: Hauptgeräte, gemeinsam erforderlich; keine mehrdeutigen ODER-Listen.
- `exercise.requires`: zusätzliche Bank, Rack, Aufhängung, Partner usw.
- `template.equipment`: verbindlicher verfügbarer Geräterahmen der Vorlage.
- Ein CLI-Inventar schränkt diesen Rahmen weiter ein und erweitert ihn nicht.
- Auch **ohne** `--equipment` werden Defaults und Varianten gegen den Template-Rahmen geprüft.
- Die Ausgabe `equipment` und die Planbeschreibung zeigen den tatsächlich benötigten Bedarf.
- `--list --format json` liefert je Template die darin erlaubten Varianten; die globale Selector-Liste beschreibt den Gesamtkatalog.

Goblet Squat mit KB und KH sind getrennte Ausführungsvarianten. Lokale
Ausführungsvarianten tragen `sourceVariation`; Vendor-Identität und Muskelangaben
bleiben nachvollziehbar. Bank-/Rackbedarf folgt auch der Anleitung, nicht nur
dem groben Vendor-Gerätefeld.

## Dosierungen

Die bisherigen Grundprofile für Kraft-/Muskelaufbauvorlagen bleiben erhalten:

| Level | Hauptübung | Weitere Compounds | Isolationen |
| --- | --- | --- | --- |
| Beginner | 2 × 8–12 | 2 × 8–12 | 2 × 10–15 |
| Intermediate | 3 × 8–12 | 2 × 8–12 | 3 × 10–15 |
| Advanced | 5 × 5 | 2 × 8–12 | 3 × 10–15 |

Bei `five-two-legs` steht genau ein Compound zuerst; danach nur Isolationen.
Flachbank/Schrägbank und RDL/Sumo ersetzen sich. Keine zweite schwere Hüftstreckung.

Differenzierte Kraft-, Mobility- und Sensomotorikvorlagen verwenden eigene Vorgaben:
**Advanced bedeutet dort nicht automatisch 5×5**. `skill` und `mobility` sind eigene
Rollen. RIR bleibt bei Zeit-/Koordinationsaufgaben `null`; die Kontrolle bestimmt
die Satzgrenze.

Dosierungen werden in dieser Reihenfolge zusammengeführt:

1. `levels[level][role]`: Grundprofil.
2. `template.prescriptions[level][role]`: Trainingsabsicht der Vorlage.
3. `exercise.prescriptions[level]`: Übungsspezifik.
4. `slot.prescriptions[level]`: konkrete Anpassung in einer Einheit.

```json
{
  "beginner": {
    "sets": 2, "reps": null, "durationSeconds": 15,
    "restSeconds": 45, "rir": null
  }
}
```

Zeitübungen erzeugen `targetDuration` als Zahl in **Sekunden** und `targetReps: null`.
Wiederholungsübungen erzeugen `targetReps` und `targetDuration: null`.
Markdown und App-Vorgaben zeigen dieselben Werte. Gewichte bleiben `null`.
Ungültige oder widersprüchliche Vorgaben werden beim Laden des Katalogs abgewiesen.

## Bestand und Coaching-Ausrichtung

16 Vorlagen: die bestehenden sieben Gym-Splits, differenziertes Ganzkörpertraining,
Rücken/Rumpf/Schultergürtel, begrenztes Equipment, Eigengewicht, Beweglichkeit,
Schultergürtel sowie KB/KH. Neu:

- `balance-stability`: drei Einheiten mit Gewichtsverlagerung, Tandemstand,
  Einbeinstand, Uhrzeiger-Taps und Tandemschritten.
- `strength-stability`: dreimal Ganzkörperkraft mit differenzierter Dosierung und
  ergänzenden Stand-/Stabilitätsaufgaben; KH und feste Haltemöglichkeit.

Bestehende IDs und Aliase bleiben erhalten. `vital-shoulder-neck` heißt im Picker
jetzt „Schultergürtel & Rumpf“; `kettlebell-vital` verspricht kein Conditioning,
Powertraining oder einen Flow. Trainingsort und Geräte sind kein neuer Produktfokus.
Der historische Goal-Schlüssel `home` bleibt kompatibel; sein sichtbares Label
lautet „Krafttraining mit begrenztem Equipment“.

Coaching-Rahmen, Quellen, Abstufungen und Grenzen:
[WORKOUT-GENERATOR-COACHING.md](WORKOUT-GENERATOR-COACHING.md).
Die Aufgaben sind Vorlagen, keine automatische individuelle Trainingsfreigabe.

## Core und Speicherung

Core bleibt ein bewusst gewählter eigener Bestandteil:

- `6pack`: `mode: external`; konkrete Session separat in der 6Pack-App wählen.
- `posture`, `mobility`: `mode: guidance`; Coaching-Hinweise, kein verdeckt hinzugefügter Übungsblock. Konkrete Übungen stehen mit Vorgaben in den Routinen.
- `none`: kein zusätzlicher Core-Hinweis. Die neuen Balance-/Kraft-Stabilitätsvorlagen nutzen dies, weil ihre Aufgaben bereits in den Routinen stehen.

Explizites `--core` hat Vorrang vor `template.defaultCore`, sonst entscheidet das Ziel.
Die App behält die Vorgaben und Hinweise über Routinen und Planbeschreibung.

`md`, `json` und `yaml` liefern dieselben Vorgaben. `--output` schreibt ausschließlich
eine neue Datei (kein Überschreiben); `--catalog DATEI` lädt eine eigene JSON-Kopie.
Bereits gespeicherte Klientenpläne werden nicht rückwirkend geändert.

## Prüfen und erweitern

```sh
npm run test:generator
```

Abgedeckt: alle Vorlagen × Level, Quellen und lokale Aufgaben, Defaults und Varianten
gegen Geräterahmen, Zeitvorgaben, Dosierungs-Overrides, UI-Presets, CLI-Formate,
gemeinsame Auswahl, Acht-Tage-Zyklus, 5×5-Regel und Dateischutz.

[Agent-Prompts](WORKOUT-GENERATOR-PROMPTS.md) und
[Abdeckungsmatrix](WORKOUT-TEMPLATE-COVERAGE.md) beschreiben die weitere Pflege.
