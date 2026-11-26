# Unabhängige Generator-Abnahme

Stand 2026-11-26. Ausgangscommit: `87309f80`. Generator-/Katalog-Umbau läuft
separat; diese Liste legt überprüfbare Abnahmefälle fest, keine fachliche Dosierung.

## Produktmaßstab

Differenziertes Krafttraining sowie sensomotorisches Training für Balance und
Stabilität. Wirbelsäule/Rumpf und Schultergürtel sind fachliche Bereiche.
Equipment ist eine Randbedingung. Einzelne Schulter/Nacken- oder KB-Vorlagen
begründen keinen neuen Produktfokus.

## Fälle für das anschließende Review

| Bereich | Eingabe / Situation | Erwartung |
| --- | --- | --- |
| Standardvorlage | `home-dumbbell`, ohne Equipment-Flag; CLI und `planFromPreset` | Keine LH-/Kabel-/Maschinenübung im als KH-Plan beschriebenen Default; Bankbedarf entweder entfernt oder ausdrücklich ausgewiesen |
| Eigengewicht | `bodyweight-vital`, ohne Flag und im UI | Kein belasteter Goblet Squat oder versteckter Zusatzbedarf |
| Gerätealternativen | Goblet Squat mit KH oder KB | Alternativen werden als ODER verstanden; konkrete Ausführung und benötigte Geräte bleiben nachvollziehbar |
| Zusatzgeräte | KH-Bankdrücken mit ausschließlich KH und Matte | Keine stillschweigend vorausgesetzte Bank; passende freigegebene Alternative oder klarer Konflikt |
| Explizite Variante | `--goal home --equipment gym --days 3 --variant conditioning-press=kettlebell-press` | Falls ein gültiger Kandidat existiert, wird er gefunden; kein Abbruch wegen fehlendem Selector im zuerst priorisierten Kandidaten |
| Ungültige Variante | Übung existiert im Katalog, ist aber nicht im betreffenden Selector freigegeben | Ablehnung vor Ausgabe; Gerätepassung allein genügt nicht |
| Gemeinsame Anforderungen | Vitalität, KH, drei Tage | Alle Anforderungen erfüllt oder konkreter Konflikt; kein Rückfall auf zwei Tage |
| Rollierender Zyklus | `ppl-six --days 6` | Acht-Tage-Zyklus nicht als sechs Einheiten pro Kalenderwoche ausgeben |
| Dauerübungen | Plank und andere als `duration` erfasste Übungen, alle Level | Positive fachlich festgelegte Sekunden, keine konkurrierende Wiederholungsvorgabe; keine erfundenen Gewichte |
| Darstellung | Zeitvorgabe in JSON, Markdown, Plan-Dokument und Editor | Gleicher Zahlenwert und eindeutige Sekundeneinheit; fehlende Vorgaben als offen |
| Differenzierung | Hauptlift und Sensomotorik auf advanced | Keine pauschale 5×5-Übertragung auf jede Trainingsaufgabe; individuelle Vorgaben bleiben editierbar |
| Sensomotorik | Neues Balance-/Stabilitäts-Template | Konkrete verständliche Aufgabe, Vorgabe und nachvollziehbare Anpassungsstufen; Label oder Plank allein reicht nicht |
| Regression | Bestehender `five-two-legs` | Ein Compound zuerst, danach Isolationen; vorgesehene 5×5-Regel erhalten |
| Bestandsschutz | Bereits gespeicherte Pläne | Keine rückwirkende Änderung durch Template-Edits |

## Schon separat korrigiert: Zeitanzeige

`ExerciseRow.jsx` zeigte bei vorhandener numerischer Zeit nur `2×30`, ohne Einheit.
Ohne Zeitwert wurde `10s` angezeigt. Die Zusammenfassung zeigt nun `2×30 s`
beziehungsweise `2×offen`; die Eingabe bleibt `Ziel-Sekunden`.
Der Generator und seine Vorgaben werden durch diesen Anzeigefix nicht verändert.

## Nach dem Umbau ausführen

- Generator-Tests und neue Regressionen für die oben genannten Fälle.
- CLI-Ausgabe sowie `PLAN_PRESETS` und `planFromPreset` vergleichen.
- `prescriptionGroups` / `repetitionLabel` auf Erhalt der Zeitvorgaben prüfen.
- Lint und Build; angemeldeten Editor separat visuell prüfen.
- Agent-Prompt C und Abdeckungsmatrix auf veraltete Vorrang-Regeln prüfen.

Ausgangsprüfung: 10 Generator-Tests bestanden; Variantenwahl vor der
Kandidatenauswahl und veraltete Dokumentation als Review-Befunde reproduziert.
Diese Datei ist eine Abnahmeliste; sie behauptet nicht, dass die laufenden
Erweiterungen bereits fertig oder alle Fälle bestanden sind.
