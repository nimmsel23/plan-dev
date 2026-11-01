# Planbereitstellung und Rückmeldung

Stand 2026-11-01. Priorität ist der veröffentlichte Trainingsplan: erstellen,
gezielt zuweisen, beim Klienten lesen und direkt dazu Rückmeldung geben.

## Bedienung

1. Coach erstellt einen individuellen Klientenplan oder veröffentlicht ein
   Programm und weist dessen feste Version dem ausgewählten Klienten zu.
2. Der Klient findet den bereitgestellten Plan unter Training → Trainingspläne.
   Direkt an der Plankarte steht „Rückmeldung zum Trainingsplan“ mit Versionsnummer.
3. „Plan gelesen – Empfang bestätigen“ bestätigt ausdrücklich diese Version.
   Eine Frage zu Übungen, Vorgaben oder Ablauf wird darunter gespeichert.
4. Coach öffnet beim Klienten „Trainingspläne“ → „Plan ansehen“. Unter dem
   Trainingsdokument stehen Bestätigung und Rückmeldungen; dort kann er antworten.
   Der individuelle Planeditor verwendet denselben Bereich.

Version 3 beginnt mit eigener Bestätigung und eigenen Rückmeldungen. Die Daten
von Version 2 bleiben erhalten. Eine Bestätigung bedeutet weder Durchführung
des Trainings noch Zustimmung zu allen Vorgaben. Der ältere automatisch gesetzte
Gesehen-Status unter `macrocycles/.../receipts` bleibt davon getrennt.

## Gemeinsamer Code und Daten

Plan besitzt `components/PlanFeedback.jsx`, `lib/planResponseStore.js` und
`lib/planResponses.js`. Coach konsumiert den gepinnten Plan-Code; Fitness löst
dieselben Plan-Views über seinen Mini-App-Resolver auf. Der Firebase-Adapter
verwendet die Firebase-Instanz und angemeldete Identität des jeweiligen Hosts.

```text
planResponses/{clientUid}/plans/{planId}/versions/vN
  readerUid, readAt                 # ausdrückliche Empfangsbestätigung
  entries/{id}
    body, senderUid, senderRole, createdAt
```

Bestätigungen sind nur durch den tatsächlichen Klienten und nur einmal
anlegbar. Rückmeldungen sind unveränderlich, auf 2000 Zeichen beschränkt und
mit der tatsächlichen Sender-UID und Serverzeit versehen. Coach kann antworten,
aber keine Klientenbestätigung erzeugen. Fremde Klienten und anonyme Nutzer
haben keinen Zugriff. Neue Einträge erfordern eine existierende Version unter
`fitness/{uid}/macrocycles/{planId}/versions/vN`; ein Entwurf reicht nicht.
Es gilt derzeit die bestehende projektweite Coach-Rolle, keine Trainerzuordnung.

Die Regeln gehören als Fragment Plan; der zentrale Rules-Owner VitalOS bettet
sie ein und veröffentlicht sie. Kein pauschaler Zugriff über die alte
Fitness-Owner-Regel. Keine Nachrichten-Pushes oder Hintergrunddienste nötig.

## Grenzen und Freigabe

- Noch kein Deployment: erst Plan-Commit veröffentlichen, Coach-Pin übernehmen,
  zentrale Rules über den vorgesehenen VitalOS-Prozess freigeben und Apps releasen.
- Der Bereich ist für Cloud-Modi (`plan`, `firebase`, `coach`) eingebunden.
  Lokale Laptop-Entwürfe bleiben lokal; sie werden dadurch weder veröffentlicht
  noch mit einer zweiten lokalen Feedback-Datenbank versehen.
- Aktuell werden die letzten 50 Rückmeldungen einer Version angezeigt. Kein
  Such-, Bearbeitungs-, Anhangs- oder Push-Workflow. Texteingaben sind bis zum
  Speichern Komponenten-State; bei Navigation gehen ungesicherte Eingaben verloren.
- Die Oberfläche öffnet zunächst die aktuelle Version. Coach kann im Versionsselektor
  frühere Stände einschließlich Rückmeldungen öffnen; eine Suche über alle Versionen bleibt offen.
- Mobile Browser-Fixture und Zugriffsschutz wurden gegen ein isoliertes
  Demo-Projekt geprüft. Echte Geräte und die veröffentlichte Coach-/Klienten-
  Kombination sind nach Release separat abzunehmen.

## Betreuungsübersicht (2026-11-01)

`PlanDeliveryOverview` zeigt bereitgestellte Pläne und Entwürfe sowie pro freigegebener Version Empfangsstatus und Antwortbedarf. Es werden nur Bestätigung und letzter Feedback-Eintrag abonniert. „Klient wartet auf Antwort“ bedeutet: letzter gespeicherter Eintrag stammt vom Klienten; es ist kein Unread-Zähler. Cache-/Lade-/Fehlerzustände behaupten keine fehlende Bestätigung. Der Coach verwendet den Baustein in seiner Klientenliste und im Trainingsplanbereich.

In „Plan ansehen“ kann der Coach alle vorhandenen Planversionen auswählen und die jeweiligen historischen Rückmeldungen lesen/beantworten. Aktueller Stand und frühere Version sind erkennbar. Eine eigene Suche über die komplette Historie bleibt offen.
