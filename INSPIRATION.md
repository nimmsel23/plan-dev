# Plan — Strong als Inspiration

Stand: 2026-10-16. Produktziel und Arbeitsgrundlage; die beschriebenen Abläufe
sind Zielverhalten und keine Behauptung, dass sie bereits implementiert sind.

## Richtung

Plan soll sich vorerst konsequent wie Strong bedienen lassen. Der bestehende
VitalOS-Stil bleibt die visuelle Grundlage. Das Hauptproblem ist die fehlende
Benutzerführung: Funktionen existieren, ergeben aber noch keinen verständlichen
Weg durch Vorbereitung, Training und Wiederholung. Mehr Karten oder zusätzliche
Menüs allein lösen das nicht.

Der Kernablauf lautet:

**Vorlage auswählen → Workout starten → Sätze protokollieren → abschließen →
Ergebnis verstehen → beim nächsten Mal darauf aufbauen.**

Ein Trainingsplan und eine Coach-Verbindung sind optional. Jeder muss auch ohne
beides sofort sinnvoll trainieren können. Strong ist die Interaktionsreferenz;
Plan darf sich später zu einem eigenen Produkt weiterentwickeln.

## Verständliche Begriffe und Zustände

| Begriff | Bedeutung |
| --- | --- |
| Übung | Ein stabil referenzierter Eintrag aus dem Übungskatalog. |
| Workout-Vorlage | Wiederverwendbare Zusammenstellung von Übungen, Reihenfolge, Satzvorgaben und Pausen. |
| Workout | Eine konkrete Trainingseinheit mit tatsächlich absolvierten Sätzen. |
| Trainingsplan | Mehrere Vorlagen mit Reihenfolge beziehungsweise Wochen- oder Zeitraumzielen. |
| Verlauf | Abgeschlossene Einheiten und daraus berechneter Fortschritt. |

Eine Änderung während des Trainings verändert zunächst diese Einheit.
Beim Abschluss entscheidet der Nutzer ausdrücklich, ob die Vorlage ebenfalls
aktualisiert wird. Vergangene Einheiten behalten ihre damaligen Werte.
Kein zusätzliches Habit-Objekt neben dem Trainingsplan einführen.

## Einstieg und Navigation

- **Training:** Vorlagen mit eindeutiger Startaktion; laufendes Workout hat
  Vorrang. Leeres Workout und neue Vorlage bleiben direkt erreichbar.
- **Verlauf:** Abgeschlossene Einheiten öffnen, Leistungen nachvollziehen und
  eine Einheit wiederholen oder als Vorlage übernehmen.
- **Übungen:** Katalog durchsuchen, Übung verstehen und ihre eigene Historie
  ansehen. Derselbe Katalog funktioniert innerhalb des Vorlageneditors.
- **Profil:** Einstellungen und persönliche Angaben.

Coach-Pläne sind im Training sichtbar und führen zu denselben startbaren
Vorlagen. Keine zweite, isolierte Trainingsoberfläche für Zuweisungen.
Leere Zustände erklären den nächsten Schritt. Ladefehler zeigen Fehler und
Wiederholen an, statt eine leere Sammlung vorzutäuschen.

## Das laufende Workout

- Name, Laufzeit, Übungen und Abschlussaktion sind sofort verständlich.
- Pro Satz: Satztyp, vorherige Leistung, aktuelles Gewicht und Wiederholungen,
  anschließend explizit abhaken. Zeitbasierte und Körpergewichtsübungen brauchen
  passende Eingaben statt erzwungener Kilogrammfelder.
- Vorherige Werte sind als Referenz erkennbar; übernommene Vorschläge gelten
  erst nach Bestätigung als tatsächlich absolviert.
- Pause nach einem Satz starten, Timer korrigieren oder überspringen.
- Übungen hinzufügen, ersetzen oder umsortieren; Sätze ergänzen und entfernen.
- Eingaben zuverlässig speichern, Unterbrechungen überstehen und ein laufendes
  Workout wieder aufnehmen. Kein versehentlicher zweiter Start durch Doppeltipp.
- Abschluss zeigt tatsächliche Leistung und den nächsten sinnvollen Schritt.
  Abbrechen beziehungsweise Verwerfen ist klar vom Abschließen getrennt.

„Training starten“ ist die primäre Aktion. „Heute erledigt“ ist eine optionale
Kurzbestätigung und darf keine erfundenen Satzleistungen als Messwerte erzeugen.

## Yuhonas Free Exercise DB und VOS Atlas

Yuhonas ist die gemeinsame Übungsbasis; VOS Atlas muss beim Katalogvertrag und
bei der Übungsdarstellung berücksichtigt werden. Vor der Implementierung den
tatsächlichen Atlas-Owner und seine Schnittstellen ermitteln. Dieses Dokument
setzt keine bereits vorhandene Atlas-API oder gemeinsame Bibliothek voraus.

- Stabile Katalog-ID und Yuhonas-Quellreferenz erhalten; Übungen nicht anhand
  ihres angezeigten Namens zusammenführen.
- Namen, Ausrüstung, primäre und sekundäre Muskeln, Bewegungsanleitung sowie
  vorhandene weitere Metadaten konsistent normalisieren.
- Die zwei Yuhonas-Bilder als Start- und Endposition nutzen. Fehlende Bilder
  haben einen brauchbaren Fallback und blockieren das Training nicht.
- Suche und Filter nach Name, Muskel und Ausrüstung im Katalog und im Editor
  wiederverwenden. Freitextnamen bleiben ein expliziter Sonderfall.
- Coach-Zuweisungen, Vorlagen und absolvierte Workouts behalten die
  Übungsreferenz. Historische Einträge bleiben auch bei Katalogänderungen lesbar.
- Atlas dient dem Verstehen einer Übung; Plan dient ihrer Zusammenstellung und
  Durchführung. Eine Atlas-Detailansicht darf den Trainingskontext nicht verlieren.
- Keine parallele manuell gepflegte Übungsdatenbank oder zweite Importpipeline
  aufbauen, wenn Atlas beziehungsweise der bestehende Katalog den Vertrag besitzt.

## Coach → Klient → Workout

1. Coach wählt einen berechtigten Klienten.
2. Coach erstellt dessen Workout-Vorlagen aus denselben Katalogübungen:
   Reihenfolge, Sätze, Zielwiederholungen, optionale Gewichte, Pausen und Hinweise.
3. Coach bündelt die Vorlagen zu einem Trainingsplan und stellt ihn dem Klienten
   ausdrücklich zur Verfügung. Entwurf und bereitgestellter Plan sind unterscheidbar.
4. Klient sieht den Plan mit Coach-Herkunft und öffnet jede Einheit als Vorschau.
5. „Training starten“ erzeugt ein normales Workout mit Referenz auf Plan und
   Vorlage. Der Klient nutzt denselben Logger wie beim selbst erstellten Training.
6. Abschluss aktualisiert Verlauf und Planfortschritt aus echten Completions.
   Der Coach kann im berechtigten Klientenkontext die tatsächlichen Ergebnisse sehen.

Coach-Vorgaben, persönliche Anpassungen und absolvierte Leistung unterscheiden.
Planänderungen dürfen laufende oder vergangene Workouts nicht rückwirkend verändern.
Vor der Umsetzung klären, ob Zuweisungen referenziert, versioniert oder kopiert
werden; keine zweite Zuweisungsarchitektur neben vorhandenen Datenwegen erfinden.
Zugriff immer anhand der bestehenden Coach-Klient-Berechtigungen prüfen.

## Im aktuellen Code beobachtete Brüche

- `WorkoutList.jsx` stapelt mehrere konkurrierende Einstiege: Pläne, Schnellstart,
  Skills und Vorlagenordner.
- `NextUpCard.jsx` betont Quick-Complete; der Workout-Start heißt „Frei loggen“.
- `index.jsx` übergibt für Einstellungen eine leere Funktion.
- `AssignedPlans.jsx` zeigt eine eigene Checklistenoberfläche. Die Überführung
  einer Coach-Zuweisung in den normalen Workout-Logger muss durchgängig werden.
- `api.js` bildet Katalogtreffer nur auf einen Teil der Übungsmetadaten ab.
- `yuhonasImage.js` hat bereits Bildhelfer für beide Bewegungspositionen.

## Reihenfolge der Umsetzung

1. Katalogvertrag und Atlas-Anbindung verifizieren; Coach-Zuweisungen und
   Persistenzwege vom tatsächlichen Owner aus nachvollziehen.
2. Einen vollständigen Self-Service-Weg liefern: Vorlage bauen, starten,
   Sätze loggen, abschließen, im Verlauf öffnen und wiederverwenden.
3. Coach-Vorlagen und Trainingspläne in exakt diesen Ablauf integrieren.
4. Unterbrechungen, Fehler, Doppelaktionen und Änderungen an Vorlagen absichern.
5. Navigation, leere Zustände und Fortschrittsanzeigen entlang dieses Ablaufs glätten.

## Abnahme anhand echter Abläufe

- Neuer Nutzer findet eine Yuhonas-Übung, erstellt eine Vorlage und startet sie.
- Er protokolliert Sätze, pausiert, lädt neu und setzt dieselbe Einheit fort.
- Nach dem Abschluss sind Leistung und Vorlage getrennt nachvollziehbar;
  das nächste Training kann auf der vorigen Leistung aufbauen.
- Coach stellt einem Testklienten einen Plan mit mehreren Workouts bereit.
- Testklient sieht die Zuweisung, startet eine Einheit im normalen Logger und
  schließt sie ab; Coach sieht das zugehörige Ergebnis.
- Fehlende Bilder, leerer Katalogtreffer, Netzwerkfehler und unberechtigter
  Zugriff haben verständliche Zustände. Tests schreiben keine echten Klientendaten.
- Lokale Builds allein gelten nicht als Nachweis für authentifizierte
  Coach-Klient-Abläufe. Dafür braucht es einen verifizierten Browserdurchlauf
  mit isolierten Testdaten.

## Referenzen

- [Strong: Erstes Workout](https://help.strongapp.io/article/229-my-first-workout)
- [Strong: Workout-Vorlagen](https://help.strongapp.io/article/105-about-templates)
- [Strong: Vorlage nach dem Workout aktualisieren](https://help.strongapp.io/article/177-update-template)
- [Yuhonas Free Exercise DB](https://github.com/yuhonas/free-exercise-db)

## Entwicklungsstand 2026-10-16

Die Umsetzung läuft entlang dieser Richtung. Technische Beschreibung und
bewusste Grenzen stehen in `src/views/Plan/ARCHITECTURE.md`, Prüfungen und
verbleibende Lücken im zugehörigen `AUDIT.md` und `RESULTS.md`.

Konkrete Entscheidung: Die vorhandene KB-Importpipeline liefert Plan den
Yuhonas-Katalog. VOS Atlas ist im Fitness-Repo verortet und hat einen eigenen
Geräte-Mirror; Plan baut keinen parallelen Downloader. Coach-Vorlagen liegen
direkt beim Klienten und sind dort verfügbar. Neue gebündelte Coach-Pläne haben
einen expliziten Entwurf-/Bereitstellen-Schritt. Laufende Einheiten sind eigene
Snapshots. Das spätere Versionieren veröffentlichter Pläne bleibt offen.
