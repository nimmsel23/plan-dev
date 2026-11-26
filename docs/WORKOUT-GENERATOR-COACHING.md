# Coaching-Rahmen der Workout-Vorlagen

Stand 2026-11-26. Owner-Ausrichtung: differenziertes Krafttraining sowie
sensomotorisches Training für Balance und Stabilität. Wirbelsäule/Rumpf und
Schultergürtel gehören in den Ganzkörperbezug. Schulter/Nacken oder ein bestimmtes
Gerät begründen keinen eigenständigen Produktfokus.

## Differenziertes Krafttraining

Der Generator liefert einen anpassbaren Entwurf aus ausgewählten Bewegungen und
Vorgaben. Trainingsabsicht, Übung und konkreter Übungsplatz können die globale
Level-Dosis überschreiben. So wird ein erfahrener Klient bei Rumpf-/Kontrollarbeit
nicht pauschal auf fünf schwere Fünfersätze gesetzt.

`strength-stability` verbindet Kniebeuge, Hüftstreckung, Druck, Zug und Rumpfarbeit
mit kurzen Standaufgaben. Der Plan ergänzt die bestehenden Splits; er ersetzt
weder Daniels Advanced-5×5-Variante noch die individuelle Planung im Coaching.
Die Übungsauswahl ist ein Ausgangspunkt und keine vollständige Abdeckung aller
Trainingsziele, Bewegungsrichtungen oder individuellen Voraussetzungen.

## Sensomotorik: konkrete Aufgaben

| Aufgabe | Dosierung Beginner | Leichter | Schwerer bei sicherer Kontrolle |
| --- | --- | --- | --- |
| Gewichtsverlagerung | 2 × 4–6 Links-/Rechts-Zyklen | kleinerer Weg, mehr Handkontakt | größerer kontrollierter Weg |
| Tandemstand | 2 × 20 s je Fußstellung | Halbtandem, Handkontakt | Handkontakt reduzieren |
| Einbeinstand | 2 × 10 s je Seite | freie Zehenspitze aufsetzen | 15–20 s, weniger Handkontakt |
| Uhrzeiger-Taps | 2 × 4–6 Kontakte je Standbein | kleiner Radius, Handkontakt | mehr kontrollierte Reichweite |
| Tandemschritte | 2 × 4–6 Schritte | breitere Schrittspur | schmalere Spur bei sicherem Gang |

Die expliziten `coaching`-Einträge je Level, `regression`, `progression` und
`instructions` werden in die Übungsnotizen übernommen. Sie sind dadurch auch im
bestehenden Planeditor und in gespeicherten Routinen vorhanden, ohne einen neuen
Session-Runner vorauszusetzen.

Alle Aufgaben verwenden stabilen Boden, offene Augen und eine erreichbare feste
Haltemöglichkeit. Höheres Trainingslevel schaltet keine instabilen Unterlagen,
geschlossenen Augen oder zusätzlichen Lasten automatisch frei. Kontrolle und
Unterstützungsbedarf bestimmen die passende Variante. Nur eine Anforderung auf
einmal steigern; bei deutlichem Kontrollverlust vereinfachen.

Die genannten Mengen sind **editierbare Coaching-Ausgangswerte**, keine validierte
individuelle Einstufung oder automatisch berechnete Sturzprävention. Der Generator
führt keinen Gleichgewichtstest durch und leitet keine Reha-Indikation ab.

## Beweglichkeit und Zeitübungen

`mobility-flow` enthält jetzt konkrete Arbeit an Wirbelsäule, Hüfte und Sprunggelenk
statt eines überwiegend als Mobility bezeichneten Kraftzirkels. Rotationen und
Sprunggelenkbewegungen erhalten Wiederholungen; Haltepositionen Sekunden.
Der Vendor-Eintrag `Cat_Stretch` beschreibt statisches Runden für 15 Sekunden.
Deshalb heißt diese Übung nicht mehr irreführend dynamisches „Cat-Cow“.

Plank: Beginner 2 × 15 s, Intermediate 3 × 25 s, Advanced 3 × 35 s. Qualität bestimmt
die Satzgrenze; kein Muskelversagen und keine RIR-Zahl für diese Zeitvorgaben.
Bewegungsumfang, Unterstützung und Dosierung bleiben im Coaching anpassbar.

## Quellen und Identität

- [ACSM 2026: Resistance Training Guidelines](https://acsm.org/resistance-training-guidelines-update-2026/): regelmäßiges Training und individuelle Ziele bestimmen die Planung; Belastungsvariablen sollen zur Person und Absicht passen. Daraus folgt hier die technische Möglichkeit, globale Level-Dosen gezielt zu überschreiben. Die konkrete Vorlagendosis ist unsere Umsetzung, keine 1:1-Vorschrift der ACSM.
- [WHO-Empfehlungen](https://www.ncbi.nlm.nih.gov/books/NBK566046/): multikomponentige Aktivität mit funktionellem Gleichgewicht und Kraft ist insbesondere für ältere Erwachsene ein eigener Bereich. Daraus wird keine Altersbeschränkung aller Vorlagen oder automatische Wirksamkeitszusage abgeleitet.
- [NHS: Balance exercises](https://www.nhs.uk/live-well/exercise/balance-exercises/): beschreibt kontrollierte Schritte, Einbeinstand und erreichbare Unterstützung. Unsere Aufgaben und Abstufungen orientieren sich daran; Tandemstand, Taps und die Dosierungen sind eigenständig formulierte Coaching-Vorlagen.
- Vendor-Übungen bleiben auf den gepinnten Dateien unter `vendor/free-exercise-db/exercises/` referenziert. Muskelangaben bleiben quellgetreu.
- Aufgaben ohne passenden Vendor-Eintrag sind ausdrücklich `source.type: coach-template` mit vollständiger eigener Anleitung. Keine erfundenen Yuhonas-IDs, keine fremden Muskelzuordnungen als Lückenfüller.
- Lokale Ausführungsvarianten (etwa Goblet Squat mit KH statt KB, stehende Reverse Flys) haben eigene `exercise_id` und `sourceVariation`. Der verwandte Vendor-Eintrag bleibt über `source.related_yuhonas_id` zur Herkunft nachvollziehbar. Lokale Varianten tragen kein direktes `yuhonas_id`; dadurch werden keine unpassenden Vendor-Bilder als exakte Darstellung eingeblendet.

Bank, Rack, Klimmzugstange, Partner und Haltemöglichkeit stehen als Zusatzbedarf im
Gerätevertrag. „Eigengewicht“ allein beweist nicht, dass keine Hilfsmittel nötig sind.

## Bewusst noch nicht abgebildet

Kein automatischer Eingangstest, Schmerz-/Beschwerdealgorithmus, verbindlicher
15-/30-/45-Minuten-Plan, Ausdauer-/Intervall-Runner oder automatische mehrwöchige
Fortschrittsentscheidung. Solche Funktionen brauchen einen konkreten Coaching-Vertrag.
Der bestehende Acht-Tage-PPL bleibt ein Basisplan und wird nicht als identische
Kopie von Jeff Cavaliere ausgegeben.
