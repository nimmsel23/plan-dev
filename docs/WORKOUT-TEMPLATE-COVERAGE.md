# Abdeckung der Workout-Templates

Historische Bestandsaufnahme: 2026-11-26, Quellstand `b37a073c` auf `dev`.
Die folgende Matrix hält den damaligen Befund fest. **Aktueller Revisionsstand am Ende dieser Datei.**

## Maßstab des Owners

Die Ausrichtung ist differenziertes Krafttraining sowie sensomotorisches Training
für Balance und Stabilität. Wirbelsäule/Rumpf und Schultergürtel gehören in diese
fachliche Struktur; Nacken ist kein gesetzter eigener Produktfokus.
Schulter/Nacken und Kettlebell wurden als einzelne Ergänzungen angelegt und
begründen keine Neuausrichtung des Angebots.

Der Generator unterstützt Daniels Planerstellung und Anpassung im Coaching.
Equipment beschreibt verfügbare Mittel, keine Zielgruppe. Home-Workouts für
möglichst günstiges Selbsttraining sind kein gesetzter Geschäftsfokus.
Die Vermutung, dass solche Selbstversorger wenig Coaching-Nachfrage haben,
ist eine Zielgruppenhypothese, keine belegte Aussage über alle Heimtrainierenden.
Bestehende Templates werden durch diese Bestandsaufnahme nicht entfernt.

## Quellen und Prüfgrenzen

- [Katalog](../src/views/Plan/data/workoutTemplates.json): Übungen, Selektoren, Routinen und Metadaten.
- [Generator](../src/views/Plan/lib/workoutGenerator.js): Auswahl, Dosierung und Ausgabe.
- [UI-Adapter](../src/views/Plan/lib/planPresets.js): dieselben Vorlagen im Picker.
- [CLI](../bin/plan-generate) und gepinnte Vendor-Dateien unter `vendor/free-exercise-db/exercises/`.
- [Produktfundament](VISION.md): Entwurf → Freigabe → Klient → Feedback; Akte bei Coach, Ausführung bei Fitness.

Alle 14 Vorlagen wurden mit ihrem jeweiligen Default-Level erzeugt und die
Standardübungen sowie alle Selector-Alternativen auf Gerätebedarf durchgesehen.
Die Matrix beschreibt die technische/inhaltsbezogene Abdeckung, keine klinische
Eignung, Wirksamkeitsbewertung oder individuelle Trainingsfreigabe.
Vendor-Geräteangaben sind grob: Bank, Rack oder sichere Aufhängung werden nicht
vollständig durch diese Metadaten beschrieben. Katalogvarianten können vom
Vendor-Gerätefeld abweichen (z. B. Goblet Squat mit KH statt Kettlebell).

## Tatsächlicher Bestand: 14 Vorlagen

LH = Langhantel, KH = Kurzhantel, KB = Kettlebell. Geräte beziehen sich auf
Standardauswahl; Varianten können zusätzlichen Bedarf einführen.

| Template | Ziel-Label / Rhythmus | Tatsächlicher Inhalt | Geräte / offene Aussage |
| --- | --- | --- | --- |
| `full-body` | hypertrophy · 3/7 Tage | Ganzkörper A/B/A, Kniebeuge, Druck, Zug, Hüftstreckung, Ergänzungen | LH, KH, Kabel, Maschine; Maschine fehlt in Template-Geräteliste |
| `push-pull` | hypertrophy · 4/7 | Push/Pull mit Beinübungen | LH, KH, Kabel, Maschine; Maschine fehlt in Geräteliste |
| `ppl-basic` | hypertrophy · 3/7 | Push/Pull/Beine | LH, KH, Kabel, Maschine; Maschine fehlt in Geräteliste |
| `daniel-three` | hypertrophy · 3/7 | Brust/Trizeps, Rücken/Bizeps, Beine/Schultern | LH, KH, Kabel, Maschine; Maschine fehlt in Geräteliste |
| `daniel-classic-five` | hypertrophy · 5/7 | Brust, Rücken, Beine, Schultern, Arme | LH, KH, Kabel, Maschine; Maschine fehlt in Geräteliste |
| `five-two-legs` | hypertrophy · 5/7 | Split mit zwei Beintagen; ein Compound pro Einheit | LH, KH, Kabel, Maschine; Maschine fehlt in Geräteliste |
| `ppl-six` | hypertrophy · 6/8 | Zwei PPL-Blöcke im rollierenden Acht-Tage-Zyklus | LH, KH, Kabel, Maschine; kein Sechs-Tage-Wochenplan |
| `vital-health` | vitality · 2/7 | Gemischtes Ganzkörper-Krafttraining plus Rumpf | Trotz KH/Eigengewicht-Label auch LH-RDL und Latzug; Goblet Squat im Vendor mit KB |
| `vital-back-posture` | vitality · 3/7 | Krafttraining mit Rücken-/Rumpfübungen, Face Pull, Druck und Beinen | Auch LH-RDL und LH-Rudern; LH fehlt in Geräteliste; keine reine KH-Vorlage |
| `home-dumbbell` | home · 3/7 | Ganzkörper-Krafttraining mit Rumpf | Startet mit LH-Bankdrücken; widerspricht „nur KH und Matte“. Varianten enthalten Kabel/LH |
| `bodyweight-vital` | home · 3/7 | Pushups, Glute Bridge, Superman, Dead Bug, Plank, Goblet Squat | Goblet Squat benötigt Last; widerspricht „ohne jedes Trainingsgerät“. Varianten auch KH/LH |
| `mobility-flow` | mobility · 2/7 | Überwiegend Rumpf-/Kräftigungsübungen; Cat Stretch, Goblet Squat | Kein breit ausgearbeiteter Mobility-Flow; Goblet Squat widerspricht Eigengewicht-Label |
| `vital-shoulder-neck` | vitality · 2/7 | Schulterdrücken, Rudern, Reverse Flys, Pushups, Seitheben und Rumpf | KH plus Eigengewicht; eher Schultergürtel-/Rumpf-Kraftvorlage als spezifischer Nackenplan |
| `kettlebell-vital` | home · 3/7 | KB Press, Renegade Row, Halo, Goblet Squat, KH-Rudern, Rumpf | KB UND KH; Satztraining. „Conditioning“, „Power & Hinge“ und „Flow“ im Namen/Labels nicht durch entsprechenden Ablauf belegt |

Verteilung der vorhandenen Labels: **7 hypertrophy, 3 vitality, 3 home,
1 mobility**. Diese Zahlen zählen Vorlagen, keine fachliche Qualität oder
vollständige Abdeckung. Die Kategorien mischen Trainingsziel und Trainingsort.

## Fachliche Abdeckungsmatrix

„Teilweise“ bedeutet: Bausteine vorhanden, aber kein durchgängiges Konzept im
Template-/Generatorvertrag. Neue Inhalte erst fachlich ausarbeiten, dann umsetzen.

| Bereich | Bestand | Fehlende Abdeckung / Bewertung |
| --- | --- | --- |
| Allgemeines Ganzkörper-Krafttraining | Mehrere Vorlagen, 2–3 Einheiten | Vorhanden; Geräteversprechen zuerst korrigieren |
| Differenziertes Krafttraining | Viele Übungsvarianten, Splits, RIR und Pausen | Teilweise: alle Vorlagen teilen dieselben rollenabhängigen Level-Dosierungen; keine übungs-/absichtsspezifische Dosierung oder systematische Regression/Progression |
| Wirbelsäule / Rumpf | RDL, Rudern, Bridge, Superman, Dead Bug, Plank und Cat Stretch verteilt | Teilweise: Sammlung vorhanden, keine explizite Struktur nach Trainingsabsicht und individueller Anpassung; „Rücken“ im Namen allein genügt nicht |
| Schultergürtel | Druck, Rudern, Reverse Fly, Face Pull, Seitheben | Vorhandene Bausteine; kein Grund für dominanten Schulter-/Nackenfokus |
| Sensomotorik: Balance und Stabilität | Lunges, Rumpfübungen, Renegade Row als einzelne Anknüpfungen | Kein systematisch aufgebautes Template, keine definierte Abstufung von Unterstützung, Stand-/Aufgabenbedingungen und Schwierigkeit |
| Beweglichkeit | Ein Mobility-Label, Cat Stretch, Halo, Hinweise | Teilweise; Zeitvorgaben fehlen und allgemeine Kraftübungen dominieren die Mobility-Vorlage |
| Wiedereinstieg / Anpassung an Trainingsstand | Drei globale Level ändern Sätze/Reps/Pausen/RIR | Kein eigenständiger Wiedereinstiegsverlauf; beginner ist kein Ersatz für individuelle Einschätzung |
| Zeitbudget | Unterschiedliche Übungs- und Satzzahlen | Keine explizite Dauer oder belastbare 15-/30-/45-Minuten-Auswahl |
| Ausdauer / Conditioning | KB-Label und Core-Intervallhinweis | Kein strukturierter Ausdauer-, Zirkel- oder Intervallplan im Generator; späterer Ausbau, kein neu gesetzter Schwerpunkt |
| Equipment | Viele Einzelgeräte im Katalog | Inkonsistente Metadaten; kein verlässlicher gemeinsamer Filter aller Übungen und Varianten |

Balance und Stabilität werden nicht schon durch einen Plank, eine einbeinige
Übung oder das Wort „Balance“ im Routinenlabel als vollständig abgedeckt gewertet.
Ebenso ist eine feinere Muskelaufteilung allein noch kein differenziertes
Krafttrainingskonzept. Diese Matrix legt keine medizinischen Programme fest.

## Generator-Lücken mit reproduzierbarem Befund

| Priorität | Befund | Abnahmekriterium für die spätere Umsetzung |
| --- | --- | --- |
| 1 | Geräteversprechen stimmen bei mehreren bestehenden Vorlagen nicht | Default und jede freigegebene Variante erfüllen das deklarierte Geräteprofil; Zusatzbedarf sichtbar; Tests für alle Templates |
| 1 | Dauerübungen erhalten Reps statt Zeit: Plank/Cat Stretch z. B. `targetReps: "10-15"`, `targetDuration: null` | Übungsspezifische, fachlich festgelegte Zeit-/Wiederholungsvorgaben; korrekte JSON- und lesbare Ausgabe |
| 1 | **Behoben durch `87309f80` (historischer Befund):** Kombinierte Auswahl war kein Filter: `goal=vitality`, `equipment=dumbbell`, `days=3`, `level=beginner` ergibt `vital-health` mit 2 Tagen und zusätzlichem Gerätebedarf | Alle angegebenen Anforderungen werden gemeinsam erfüllt oder ein verständlicher Konflikt gemeldet; CLI und UI verwenden denselben Vertrag |
| 2 | Globale Level-Dosis gilt für jede Übung derselben Rolle; advanced setzt Hauptübungen pauschal auf 5×5 | Differenzierte Vorgaben können je Trainingsabsicht/Übung abgebildet werden, ohne bestehende Pläne rückwirkend zu ändern |
| 2 | Core-Module sind nur Label/Hinweis; `planFromPreset` übernimmt keinen eigenständigen Core-Übungsblock | Klarer Vertrag, ob ein Modul konkrete Vorgaben oder einen externen Trainingsbaustein liefert; UI/Export müssen das gleich darstellen |
| 2 | Keine systematische Abbildung sensomotorischer Aufgaben und Schwierigkeitsstufen | Plan kann konkrete Aufgabe, Vorgabe, Hilfsmittel und nachvollziehbare leichtere/schwerere Variante transportieren; Fitness verantwortet Ausführung |
| 3 | Kategorien mischen Ziel, Ort und Mittel | Trainingsabsicht, Schwerpunkt und Equipment separat beschreiben; vorhandene IDs/Pläne erhalten |
| 3 | Kein Dauerbudget, Zirkel- oder Intervallmodell im Generator | Erst bei konkretem Coaching-Bedarf spezifizieren; keine entsprechenden Versprechen durch bloße Namen |

Reproduktion aus dem Repo:

```sh
node bin/plan-generate --list --format json
node bin/plan-generate Audit --goal vitality --equipment dumbbell --days 3 --level beginner --format json
node bin/plan-generate Audit --template mobility-flow --level beginner --format json
```

Die bisherigen grünen Tests belegen u. a. Referenzen, Rollen und
Satzprofile. Sie belegen noch keine vollständige Geräteverträglichkeit aller
Templates, keine passende Zeitdosierung und keine fachliche Vollständigkeit.

## Reihenfolge der weiteren Arbeit

1. Bestehende Auswahl und Ausgabe verlässlich machen: Geräte, Zeitvorgaben,
   gemeinsame Anforderungen; irreführende Namen und Versprechen angleichen.
2. Fachlichen Vorlagenrahmen für **differenziertes Krafttraining** formulieren:
   Trainingsabsicht, Wirbelsäule/Rumpf, Schultergürtel und Ganzkörperbezug;
   konkrete Anpassbarkeit statt weiterer fast identischer Splits.
3. **Sensomotorisches Training für Balance und Stabilität** als eigenen
   Vorlagenbereich ausarbeiten, inklusive verständlicher Aufgaben und Abstufungen.
4. Erst daraus gezielte Templates ergänzen. Home, KB, Schulter/Nacken oder eine
   maximale Vorlagenzahl sind keine Priorisierungsgrundlage.

Diese Session liefert die Bestandsaufnahme und Arbeitsreihenfolge. Sie verändert
keine Trainingsvorlage, verschickt keinen Klientenplan und gibt keinen Plan frei.


## Revision 2026-11-26 — Grundlagen korrigiert, gezielt ergänzt

- Gemeinsame Auswahl aus Ziel, Equipment und Tagen durch `87309f80` korrigiert.
- Gerätevertrag gilt jetzt auch ohne CLI-Filter und im App-Picker. Templates haben verbindliche Inventare; `requires` erfasst Bank, Rack, Aufhängung, Partner und Haltemöglichkeit. Template-unverträgliche Varianten werden nicht angeboten beziehungsweise abgewiesen.
- Kurzhantel-Floor-Press, stehendes KH-Drücken und vorgebeugtes KH-Rudern vermeiden stillen Bankbedarf. Eigengewichts-Templates enthalten keine Goblet-Last mehr. KB-/KH-Goblet-Ausführungen sind getrennt.
- Plank und Cat Stretch liefern echte Sekunden statt Wiederholungen; Ausgabe, JSON/YAML und UI-Presets stimmen überein.
- Rollen `skill` und `mobility` sowie Template-/Übungs-/Platz-Overrides erlauben differenzierte Dosierungen. Advanced setzt die neuen allgemeinen Kraft-/Sensomotorikvorlagen nicht automatisch auf 5×5.
- `balance-stability` und `strength-stability` ergänzen den Bestand auf **16 Vorlagen**. Die Sensomotorikvorlage enthält konkrete Stand-/Schritt-/Verlagerungsaufgaben, Unterstützung und nachvollziehbare Abstufungen; kein automatischer Eingangstest oder klinischer Wirksamkeitsnachweis.
- Mobility-Inhalte sind jetzt Wirbelsäulenrotation, Sprunggelenkarbeit und Hüftmobilisation plus quellgetreuer Cat Stretch. Schulter-/Nacken- und Conditioning-/Power-/Flow-Versprechen wurden aus unpassenden Labels entfernt; IDs bleiben kompatibel.
- Core-Vertrag explizit: 6Pack ist extern, posture/mobility sind Hinweise; kein unsichtbar erzeugtes Zusatztraining. Konkrete Aufgaben stehen in den Routinen.

Verbleibende Grenzen: individuelle Einstufung, mehrwöchige automatische Anpassung,
Zeitbudget, Ausdauer-/Zirkelmodell und eine spätere saubere Trennung historischer
Goal-Schlüssel (insbesondere `home`) von Trainingsabsicht und Equipment.

Details: [Generator-Vertrag](WORKOUT-GENERATOR.md) und
[Coaching-Rahmen](WORKOUT-GENERATOR-COACHING.md).
