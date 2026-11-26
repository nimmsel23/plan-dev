# Workout Generator

`bin/plan-generate` erzeugt anhand von **Name und Level** einen bearbeitbaren Trainingsplan aus den Basic-Templates. Ohne weitere Optionen geht der Plan auf stdout; es werden weder Kontodaten noch Trainingslogs angelegt.

```sh
# Defaults: Beginner → Ganzkörper, Intermediate → PPL, Advanced → 5er mit 2 Beintagen
./bin/plan-generate --name Daniel --level beginner
./bin/plan-generate --name Daniel --level intermediate
./bin/plan-generate --name Daniel --level advanced

# Split gezielt wählen; Schrägbank ersetzt die Flachbank, Sumo ersetzt RDL
./bin/plan-generate Daniel --level intermediate --template five-two-legs \
  --variant chest-press=incline-bb --variant hinge=sumo

# Maschinenlesbar oder als neue Datei; existierende Dateien werden nicht überschrieben
./bin/plan-generate Daniel --level advanced --format json
./bin/plan-generate Daniel --level advanced --format yaml
./bin/plan-generate Daniel --level advanced --output /tmp/Daniel-5x5.md

# Alle Templates, Level und zulässigen Alternativen
./bin/plan-generate --list
./bin/plan-generate --list --format json
```

Auch außerhalb des Repo-Ordners funktioniert der absolute Aufruf:

```sh
/home/alpha/dev/plan-dev/bin/plan-generate Daniel --level intermediate
```

Die vorhandene Shell-PATH-Konfiguration nimmt `~/dev/*/bin` beim Shell-Start auf. Nach Öffnen einer neuen Shell ist der kurze Aufruf `plan-generate` verfügbar; kein Wrapper in `~/.local/bin` nötig. Alternativ: `npm run plan:generate -- --name Daniel --level beginner` im Repo.

## Die Daten bearbeiten

**Eine Datenquelle:** [`src/views/Plan/data/workoutTemplates.json`](../src/views/Plan/data/workoutTemplates.json). Der bestehende App-Vorlagenpicker und das Skript nutzen beide diese Datei. Kein zweiter Satz fest einprogrammierter Übungen im CLI.

| JSON-Bereich | Zweck |
| --- | --- |
| `schemaVersion` | Aktuell `1`; unbekannte Versionen werden abgewiesen |
| `exercises` | Konkrete Katalog-ID, Yuhonas-ID, Name, Muskel-/Gerätedaten, Art und Trackingtyp |
| `selectors` | Übungsplätze mit zulässigen Alternativen und Standardwahl |
| `levels` | Dosierung getrennt nach `main`, `compound` und `isolation` |
| `templates` | Split, Zykluslänge, Trainingstage und ausgewählte Übungsplätze |
| `defaults` | Passendes Standardtemplate pro Level und Standarddauer |
| `core` | Eigenständiger Core-Baustein; keine erfundene konkrete 6Pack-Session |
| `progression` | Gemeinsame Hinweise zur Laststeigerung |

Beispiel eines Übungsplatzes in einer Einheit:

```json
{ "selector": "chest-press", "role": "main" }
```

Dieser Platz löst genau **eine** Übung auf. Zum Beispiel ersetzt `--variant chest-press=incline-bb` das Standard-Bankdrücken; es hängt keine zweite Druckübung an. Ein fester Übungsplatz sieht so aus:

```json
{ "exercise": "extend", "role": "isolation" }
```

Eine Übung wird mit ihrer tatsächlichen Katalog-/Yuhonas-Identität gespeichert. Namen werden nicht automatisch zusammengeführt. Neue Übungsvarianten zuerst aus dem gepinnten `vendor/free-exercise-db` bzw. vorhandenen Katalog aufnehmen und dann im passenden Selector freigeben. Nicht nach Namen raten oder IDs erfinden.

Eigene Kopien des Katalogs können ohne Codeänderung genutzt werden:

```sh
./bin/plan-generate Daniel --level intermediate --catalog /pfad/meine-templates.json
```

Der Generator prüft Schemaversion, Referenzen, Rollen, Dosierung und Zyklustage. Ungültige Eingaben brechen mit Exitcode 2 und einer Fehlermeldung auf stderr ab. Sie werden nicht still durch Standardwerte ersetzt.

## Level

| Level | Hauptübung | Weitere Compounds, falls Template sie enthält | Isolationen |
| --- | --- | --- | --- |
| Beginner | 2 × 8–12 | 2 × 8–12 | 2 × 10–15 |
| Intermediate | 3 × 8–12 | 2 × 8–12 | 3 × 10–15 |
| Advanced | 5 × 5 | 2 × 8–12 | 3 × 10–15 |

Die Profile sind editierbare Ausgangswerte und keine automatische Einstufung einer Person. Lasten bleiben `null`; das Skript erfindet keine Kraftwerte. Die Level verändern Sätze, Wiederholungen, Pausen und Reserve, nicht heimlich die ausgesuchte Übung.

Beim Template `five-two-legs` gilt für alle Level: **genau ein Compound am Anfang, danach nur Isolationen**. Das Advanced-Profil ergibt dort den besprochenen Advanced-5×5-Plan. Ganzkörper/PPL/Push-Pull enthalten dagegen bewusst mehrere Mehrgelenkbewegungen; nur der als `main` bezeichnete Platz erhält 5×5.

## Templates und Zyklen

| ID | Rhythmus |
| --- | --- |
| `full-body` | Ganzkörper A/B/A an Tag 1, 3, 5; 7-Tage-Woche |
| `push-pull` | Push/Pull mit Beinen an Tag 1, 2, 4, 6 |
| `ppl-basic` | Push/Pull/Beine an Tag 1, 3, 5 |
| `daniel-three` | Brust/Trizeps, Rücken/Bizeps, Beine/Schultern an Tag 1, 3, 5 |
| `daniel-classic-five` | Brust, Rücken, Pause, Beine, Schultern, Arme, Pause |
| `five-two-legs` | Brust/Trizeps, Rücken/Bizeps, Pause, Beine A, Schultern/Arme, Beine B, Pause |
| `ppl-six` | Training an Tag 1, 2, 3, 5, 6, 7; Pausen an Tag 4 und 8 |

`ppl-six` ist ein **rollierender Acht-Tage-Zyklus**, kein Kalender mit sechs Trainingstagen pro Woche. Es ist ein Basic-Template aus unserem Übungspool, keine 1:1-Reproduktion von Jeffs Videos mit deren Intensivierungstechniken.

Im JSON stehen `schedule.cycleDays`, `trainingDays`, `restDays` und pro Routine `cycleDay`. Nur 7-Tage-Templates erhalten `weekdays` (Montag = 0). Acht-Tage-Pläne behalten leere `weekdays` und `targetPeriodDays: 8`; Pausen nach den dritten Einheiten werden als `restHoursAfter: 48` ausgegeben. Das beschreibt den vorgesehenen Rhythmus bei vergleichbarer Trainingszeit; die CLI startet keinen Kalenderdienst.

## Core und Ausgabe

Core ist standardmäßig ein **fester eigener Trainingsbaustein**, kein Restprogramm. Die Auswahl einer konkreten Session erfolgt in der 6Pack-App. `--core none` lässt den Baustein ausdrücklich weg, falls ein anderer Plan ohne ihn erstellt werden soll.

- `md`: lesbare Übersicht, Zyklustage und Trainingstabellen.
- `json`: bestehende Planfelder `name`, `description`, `totalWeeks`, `routines` und `templateSets`; zusätzlich Generatorherkunft, Zyklusübersicht und Core-Baustein.
- `yaml`: dieselbe Struktur wie JSON.
- `--output`: schreibt ausschließlich eine neue, ausdrücklich benannte Datei. Ein bestehendes Ziel wird geschützt. Kein Firestore-Import, keine automatische Zuweisung, kein Versand.

Der App-Picker nutzt die Routine-/Planfelder des bestehenden Editors. Zusätzliche CLI-Metadaten sind kein neuer Backendvertrag. Der Zyklus und der Core-Hinweis bleiben auch in der Planbeschreibung enthalten. Bereits gespeicherte Pläne werden durch Änderungen an den Templates nicht rückwirkend angepasst.

## Prüfen

```sh
npm run test:generator
```

Die Tests decken alle Templates × Level, sämtliche Selector-Alternativen, Katalogreferenzen, den Acht-Tage-Zyklus, die Ein-Compound-Regel, unabhängige Kopien, geänderte JSON-Dosierungen, CLI-Formate, Fehlermeldungen und den Schutz vorhandener Dateien ab.
