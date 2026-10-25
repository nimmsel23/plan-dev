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

**Auslieferung (seit 2026-10-22):**
- Die **Klienten-Übersicht** zeigt pro Klient bereitgestellte Pläne/Entwürfe und
  Workouts der letzten 7 Tage; Antippen öffnet den Klienten.
- Am Plan steht ein **Hinweis für den Klienten** (Ziel, Ablauf, Cues). Er wird
  beim Verlassen des Feldes gespeichert und erscheint beim Klienten über dem Plan.
- **Zurück in den Entwurf setzen** zieht einen Plan zurück (für den Klienten
  unsichtbar); erneutes Bereitstellen ist jederzeit möglich.
- **Wochenplan:** Pro Einheit setzt der Coach Wochentage (Mo–So, mehrere möglich).
  Der Plan zeigt dann einen 7-Tage-Streifen; der Klient sieht „Heute geplant: …“,
  bis die Einheit heute abgeschlossen ist. Die Tage sind Orientierung, keine Sperre;
  Einheiten ohne Tage rotieren wie bisher. Kopien übernehmen die Wochentage.
- **Neu-Hinweis:** Stellt der Coach einen Plan bereit (oder erneut bereit), erscheint
  beim Klienten oben im Training ein Banner und ein Punkt am Reiter „Trainingspläne“.
  Der Stand „gesehen“ liegt pro Gerät im localStorage. Echte Push-Nachrichten gibt es nicht.
- **Push-Nachricht:** Der Klient aktiviert sie über die Karte „Benachrichtigung …“
  oben im Training (Browser-Erlaubnis nötig, nur im Firebase-Build). Die Cloud
  Function `onPlanPublished` (`functions/index.js`, Logik in `functions/planPublished.js`)
  sendet bei neuem `publishedAt` eines Coach-Plans einen Push an seine Geräte
  (Token in `fitness/{uid}/settings/push`, Typ `plan` abschaltbar). Hinweis-Änderungen
  oder Wochentage lösen nichts aus. Deploy: `firebase deploy --only functions:onPlanPublished`.
- **An weiteren Klienten kopieren** legt den Plan samt Einheiten und Hinweis als
  Entwurf bei einem anderen Klienten an; dort prüfen und bereitstellen.

**Versionen (seit 2026-10-22):** Bereitstellen ist wie ein Git-Commit: Der Coach
gibt eine Nachricht an („Woche 3: mehr Volumen“), der Plan bekommt Version N. Klienten sehen
immer nur die letzte Version; Bearbeiten danach bleibt unsichtbar. Der Plan zeigt
„Unveröffentlichte Änderungen“ als Diff, **Verlauf** listet alle Versionen mit ihren Änderungen,
**Als Arbeitsstand wiederherstellen** holt eine ältere Version zurück (danach neu veröffentlichen).

Änderungen an einer Vorlage aktualisieren bestehende Plan-Snapshots nicht
stillschweigend. Für einen geänderten Plan die betreffende Einheit neu aus der
aktualisierten Vorlage hinzufügen. Veröffentlichte Planänderungen werden erst mit der nächsten Version sichtbar. Laufende und vergangene
Workouts bleiben eigenständige Snapshots.

Ältere Coach-Zuweisungen sind ebenfalls als normales Workout startbar. Ihre
früheren Checklisten-Haken werden nicht nachträglich in Leistungsdaten verwandelt.

## Übungen und Atlas

**Übungen → Katalog** funktioniert auch ohne bisherige Workouts. Suche und
Filter helfen nach Name, Muskel oder Equipment. Eine Übung öffnet Bildpaar und
Originalanleitung. **Trainiert** zeigt persönliche Historie und Rekorde.
Der Link in den Übungsdetails öffnet die eigenständige VOS-Atlas-App in einem
neuen Tab; Plan bleibt geöffnet. Gerätespeicher beider Apps ist getrennt.
