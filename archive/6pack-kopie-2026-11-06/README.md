# 6Pack (Fitness-Kopie)

Der `timer`-Subtab von Fitness lädt `SixPackPromiseCard.jsx` aus diesem Ordner.
Die Entwicklungsquelle für Oberfläche, Runner und Theme liegt in `~/6pack-dev`.
Änderungen werden von dort mit `npm run publish:fitness -- /pfad/zu/fitness-dev/6pack`
hierher kopiert. Der Session-Tab bleibt nur der Einstiegspunkt.

Die Übungs- und Workout-YAMLs unter `fitness/catalog/kb/exercises/6pack/` sind
weiterhin die Datenquelle. `npm run build:sixpack-data` erzeugt daraus
`sixpackData.generated.js`; die generierte Datei wird nicht committed. Ein
optionales `video_url` im Übungs-YAML wird in die Runner-Daten übernommen.

Im Runner können Video-URLs pro Übung auch direkt eingetragen werden. Diese
Einstellung liegt im lokalen Browser-Speicher und überschreibt die KB-URL nur
auf diesem Gerät. Der Player erwartet eine direkt abspielbare HTTPS- oder
App-relative Videodatei, startet stumm und läuft in Schleife. Ohne URL zeigt
er einen leeren Medienbereich.

Die Sprachausgabe nutzt die Speech-Synthesis-Funktion des Browsers. Pausenstart,
Übungsstart und die letzten drei Pausensekunden erhalten Web-Audio-Signale.
Audio wird erst nach dem Start-Tap aktiviert; Verfügbarkeit und Wiedergabe bei
gesperrtem Bildschirm hängen vom Browser und Betriebssystem ab.
