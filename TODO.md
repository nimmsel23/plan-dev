
# [NEW] Coach Office 
Beispielfeature: Trainingsplanbesprechung zwischen Klient und Coach. Social Media Style. Comment-feed per Exercise

# [ ] Coach-Tab stabilisieren / Inbox als verlässlichen Review-Workflow fertigstellen
- Coach-Tab war wiederholt Problemfläche: Firestore-Inbox, lokale Catalog-Inbox,
  Runtime-Watcher und Expert-Approve liefen nicht als ein klarer, durchgehender
  Workflow.
- Stand 2026-09-06: Source-Merge im Coach-Tab ist als expliziter
  `Verbinden`-Flow umgesetzt. Firebase kann bei laufendem lokalem
  FastAPI-Prod-Server wger-/yuhonas-Kandidaten an Inbox-Drafts hängen, sodass
  der spätere Expert-Datensatz beide IDs kennt. Desktop nutzt
  `http://127.0.0.1:6100/fitness`; Firebase Hosting nutzt per Default den
  Funnel `https://ideapad.tail7a15d6.ts.net/fitness/fitness`.
- Stand 2026-09-06: Reenrich ist als Rebuild alter Inbox-Drafts zu verstehen,
  nicht als reines Umformulieren von AI-Coach-Text. Bestätigte Provenance-Felder
  (`wger_id`, `yuhonas_id`, `external_ids`, `origin`, `source_snapshot`) müssen
  beim Rebuild erhalten bleiben und dürfen nicht vom Modell "vergessen" werden.
- Offen als Makro-Ziel: Coach-Tab Ende-zu-Ende zuverlässig machen:
  Source-Kandidaten anzeigen, Quelle verbinden, optional reenrichen,
  approve/reject, lokale YAML-KB und Firestore-Expert-KB synchron halten,
  UI-Zustände/Fehler sichtbar machen und mit Browser-Durchklick gegen Firebase
  plus lokalem `:6100` verifizieren.
- Stand 2026-09-06: Firebase-Inbox ist local-first umgestellt. Firestore ist
  fuer Inbox nur noch Cache/Fallback/Offline-Warteschlange; `approveInbox()` und
  `reenrichInbox()` sollen ohne lokalen `:6100` nicht mehr final cloud-only
  schreiben.
- Offen: Browser-Durchklick gegen `fitness-aos.web.app/#coach` mit laufendem
  Funnel/`:6100`: lokale Drafts sichtbar, Source verbinden, Reenrich, Approve,
  lokale Expert-YAML und Firestore-Mirror pruefen.
- Architekturgrenze: Fitness importiert Fuel nicht direkt. Ernährung/Fuel bleibt
  ein eigener Surface; keine `@fuel/*`-Imports im Fitness-Frontend einführen.



# [ ] Session Gate / ("Skills") Thenics-Runner Ausbau (Calisthenics)
- Today-Session zuerst als `Gym Session Gate`: großer Start-/Stop-Button, Trainingstag sofort loggen, manuelles Nachtragen bleibt darunter offen.
- Während aktiver Session Thenics-artigen Guided Runner bauen:
  - Quelle: im `Plan`-Tab gepflegtes Workout oder Coach-Zuweisung, aber nicht erzwungen.
  - Fokus: `jetzt`-Übung groß, `als Nächstes` klein, klare Reihenfolge statt Formularwand.
  - nicht verhandelbar: Reps-Schieberegler während Rest, Rest-Timer, Finished-Screen.
- Session-Notification über App-Service-Worker:
  - während aktiver Session laufende Status-Benachrichtigung mit Stoppuhr,
  - beim Stop statischer Abschlussstatus,
  - Plattformgrenze sauber beachten: echtes sekundengenaues Weiterlaufen bei komplett geschlossener PWA ist browser-/OS-abhängig.

## [ ] ("Timer") 6Pack-Runner Ausbau (Tabata-like HIIT Core-Workouts) heavily inspired by ATHLEAN-X 6Pack App
wird so ähnlich erfolgen wie der Skills-Runner

# [Push Messages] 
tägliche Push benachrichtigungen bei fehlenden Logs - direkt im Benachrichtigungscenter interaktiv? 
weiteführende Idee: falls in Settings PPL-Split eingestellt dann könnte täglich eine zB Pull=done? Message aufs handy kommen bis das jeweils nächste Workout done ist.
Impuls hierzu: Klient:Matthias fehlende Ambition zum kontinuierlichen Loggen von Workouts.

## [x] 2026-10-16: nimmdaniel@gmail.com als Coach freischalten
Coach-Zugang anhand der verifizierten Firebase-UID ergänzen und zentrale Rolle setzen.

- [x] 2026-10-16: Plan-Frontend auf VitalOS-Shell wie coach-dev umstellen.
# [ ] Plan konsequent in Strong-Richtung ausbauen

Produktgrundlage: `INSPIRATION.md` (2026-10-16). Yuhonas/VOS-Atlas-Vertrag
verifizieren, vollständigen Vorlagen-/Workout-/Verlauf-Ablauf herstellen und
Coach-Trainingspläne im selben Logger für Klienten nutzbar machen.

## 2026-10-16: Strong-Ausbau — Implementierungsstand

- [x] Persönlicher Zugang für angemeldete Klienten; Coach-Verwaltung rollenbasiert.
- [x] Yuhonas-Katalog, gemeinsame Suchdaten, Bildpaar/Anleitung und Atlas-Link.
- [x] Vorlagen → Satzlogger → Abschluss → Verlauf → Wiederholen.
- [x] Gemeinsamer Vorlageneditor für Coach und Klient; Trainingsplan-Entwurf und Bereitstellen.
- [x] Startbare Plan-/Legacy-Zuweisungs-Snapshots und tatsächliche Klienten-Ergebnisse.
- [x] Lokaler Satzentwurf, serielle Remote-Writes, Retry und atomarer Firestore-Abschluss.
- [x] Isolierte Daten-/Adapter-/Router-/Proxytests und Browserdurchlauf.
- [ ] Authentifizierter Coach-/Klienten-Durchlauf auf Firebase mit isolierten Testkonten.
- [ ] Mehrgeräte-Konfliktauflösung und serverseitiger Schutz vor parallelen Starts.
- [ ] Persistenter Entwurf für noch ungespeicherte Vorlageneditor-Änderungen.
- [ ] Versionierung und Aktualisieren bereits veröffentlichter Plan-Snapshots.

Produktziel: `INSPIRATION.md`. Bedienung: `docs/PLAN-WORKFLOW.md`.

- [x] Offline-Cache über App-Updates erhalten: gemeinsame SW-Strategie, API-Migration, vollständiges Asset-Precache und sichere Installation.

## 2026-10-30: Mobiler Trainingsplan-Editor

- [x] Eigenständigen Editor für komplette Pläne mit Tagen und Übungsvorgaben bauen.
- [x] Lokale Entwürfe, Wiederaufnahme, Duplizieren, Sortieren und Vorschau ergänzen.
- [x] Atomare Speicherung, Konfliktschutz und vorhandene Freigabe/Logger verbinden.
- [x] Klientenbereich mit Pläne/Vorlagen/Ergebnisse integrieren.
- [ ] Authentifizierte Abnahme mit echten Coach-/Klientenkonten auf Firebase.
