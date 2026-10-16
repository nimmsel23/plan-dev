# Plan verwenden

Stand: 2026-10-16. Dieser Ablauf beschreibt den neuen Entwicklungsstand;
Veröffentlichung und authentifizierte Firebase-Abnahme sind separate Schritte.

## Eigenes Training

1. In Plan anmelden und **Training → Neue Vorlage** öffnen.
2. Namen festlegen, Übungen suchen und über das Informationssymbol ihre
   Ausführung ansehen. Der Katalog enthält die importierten Yuhonas-Übungen.
3. Bei einer Übung die Satzvorgaben öffnen und Wiederholungen, Gewicht, Pause
   sowie Hinweise einstellen. **Speichern**; zurück zur Vorlagenliste.
4. **Starten** öffnet eine konkrete Trainingseinheit. Tatsächliche Werte
   eintragen und jeden absolvierten Satz abhaken. Ein Zielbereich wie „8–12“
   ersetzt keine tatsächliche Wiederholungszahl.
5. **Fertig** speichert die Einheit im Verlauf. Danach kann sie ausdrücklich
   als neue Vorlage gespeichert oder ihre Ursprungsvorlage aktualisiert werden.
6. Im **Verlauf** eine Einheit öffnen und **Workout wiederholen** verwenden.

Eine laufende Einheit lässt sich minimieren und über die Fortsetzen-Leiste
wieder öffnen. Satzänderungen werden auf diesem Gerät zwischengespeichert;
bei Speicherfehlern zeigt die App den Zustand und bietet erneutes Speichern an.
Zum Starten, Ändern der Übungsstruktur und Abschließen ist ein erfolgreicher
Backend-Zugriff erforderlich. Nicht mehrere Geräte gleichzeitig zum Bearbeiten
derselben Einheit verwenden: eine Konfliktauflösung ist noch nicht umgesetzt.

## Als Coach einen Plan bereitstellen

1. Mit einem berechtigten Coach-Konto anmelden.
2. In **Training → Trainingspläne für Klienten** den Klienten auswählen.
3. Unter **Workout-Vorlagen** z. B. „Push A“ erstellen und im normalen
   Vorlageneditor Übungen, Satzvorgaben, Pausen und Hinweise festlegen.
   Diese Vorlagen liegen direkt beim Klienten und sind für ihn verfügbar.
4. **Neuer Trainingsplan** legt den gebündelten Plan als Entwurf an.
5. **Workout-Vorlage hinzufügen** wählen und Häufigkeit/Zeitraum festlegen.
   Der Plan übernimmt die aktuelle Übungsliste als eigenständigen Snapshot.
6. Sobald alle Einheiten Übungen enthalten: **Trainingsplan für Klienten
   bereitstellen**. Der Klient findet ihn unter **Training → Trainingspläne**.
7. Der Klient startet dort eine Einheit und nutzt denselben Workout-Logger.
   Seine tatsächlichen Sätze erscheinen im Coach-Workspace unter
   **Absolvierte Workouts**. Fortschritt entsteht durch abgeschlossene Workouts.

Änderungen an einer Vorlage aktualisieren bestehende Plan-Snapshots nicht
stillschweigend. Für einen geänderten Plan die betreffende Einheit neu aus der
aktualisierten Vorlage hinzufügen. Veröffentlichte Planänderungen werden aktuell
direkt sichtbar; eine Versionsverwaltung ist noch offen. Laufende und vergangene
Workouts bleiben eigenständige Snapshots.

Ältere Coach-Zuweisungen sind ebenfalls als normales Workout startbar. Ihre
früheren Checklisten-Haken werden nicht nachträglich in Leistungsdaten verwandelt.

## Übungen und Atlas

**Übungen → Katalog** funktioniert auch ohne bisherige Workouts. Suche und
Filter helfen nach Name, Muskel oder Equipment. Eine Übung öffnet Bildpaar und
Originalanleitung. **Trainiert** zeigt persönliche Historie und Rekorde.
Der Link in den Übungsdetails öffnet die eigenständige VOS-Atlas-App in einem
neuen Tab; Plan bleibt geöffnet. Gerätespeicher beider Apps ist getrennt.
