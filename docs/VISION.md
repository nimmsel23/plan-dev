# VISION — Plan

Stand: 2026-11-23.

Plan ist **nicht** eine weitere Fitness-App und **nicht** die Coach-Workbench.
Plan ist die **gemeinsame Schnittstelle** zwischen Coach und Athlet:
Trainingsplan, später Ernährungsplan, Feedback, Versionen — ein Artefakt, zwei Rollen.

**Eigentliche Diagnose:** Plan ist das, was Fitness von Anfang an hätte sein sollen —
Coach gibt Vorgaben, Athlet führt aus, beide sehen denselben Stand.
Fitness ist zum Tempel/Tracker/Ausbildungs-Kosmos ausgewachsen, bevor dieses
Betriebsmodell je festgeschrieben war. **Wie irgendetwas mit etwas zusammenspielt,
wurde nie festgelegt** — weder Auftrag noch Grenzen noch der Vertrag zwischen den Apps.
Features gibt es; ein Produktgesetz und ein Zusammenspiel-Modell fehlen.
Das Problem ist Unklarheit, nicht fehlende Buttons.

### Plan ↔ Coach (Gegenstück, das gleichzeitig innen steckt)

Fachlich ist Plan das **Gegenstück zu Coach**:

| | Coach | Plan |
| --- | --- | --- |
| Rolle | Schmiede / Betrieb / Klientenakte | Zugestelltes Artefakt + Athlet-Sicht + Dialog |
| Frage | Wen betreue ich, was schmiede ich? | Was gilt für den Athleten, was sieht er, was kommt zurück? |

Technisch steckt Plan **gleichzeitig in Coach** (Submodul `modules/plan`, Local-Schmiede
nutzt denselben Editor). Das ist Absicht für Code-Sharing — aber ohne festgeschriebenes
Zusammenspiel wirkt es wie Identitätsverlust: Ist Plan App, Modul, Tab in Fitness, oder
Teil von Coach?

**Festlegung:**

1. **Produkt:** Plan = Gegenstück (Athlet-Vertrag am freigegebenen Artefakt).
2. **Code:** Plan = Modul, das Coach und Fitness einbetten — ein Editor, kein zweiter.
3. **Coach „hat Plan inne“** heißt nur: Coach hostet die Schmiede-UI und Persistenz/Versand;
   er besitzt nicht den Produktauftrag „was der Athlet sieht“.
4. **Fitness zeigt Plan**, besitzt aber nicht die Schmiede und nicht die Klientenakte.
5. Alles, was diese Grenzen vermischt (zweiter Editor, Plan-Backend in plan-dev,
   Coach-only Athleten-UI), ist Drift.

Die alte `VISION.md` in diesem Repo war Fitness-Fork-Ballast (Anatomie, Ausbildung, Tracker).
Das hier ersetzt sie als Fundament.

---

## Das eine Satz-Warum

> Neuer Klient onboarden: Trainingsplan verpassen → er sieht ihn am Handy → Coach behält Überblick (Profil / Ausführung / Feedback).

Der technische Loop darunter:

> Coach entwirft → veröffentlicht Version → Athlet arbeitet damit → Rückmeldung kommt zurück.

Alles andere (Mikrozyklen, Katalog-Feinschliff, Session-Drills, Body-Maps) ist **Ausbau**, nicht Fundament.
Wenn dieser Loop für einen echten Klienten (heute: Raphael) nicht in Minuten klappt, ist die App noch nicht bei ihrem Zweck.

---

## Produktjob: Onboarding + Begleitung

Plan ist der **erste praktische Handshake** mit einem neuen Klienten — nicht eine Feature-Sammlung.

| Phase | Coach | Athlet | Plan liefert |
| --- | --- | --- | --- |
| **1. Onboarding** | Klient zuordnen, ersten Plan bauen, freigeben | App öffnen, Plan lesen, Empfang bestätigen | Zustellung + klares Dokument |
| **2. Betrieb** | Anpassen, neue Version, Rückfragen beantworten | Trainieren nach Vorgabe, Feedback | Versionen + Dialog |
| **3. Überwachung** | Sehen ob Plan gelesen/genutzt wird, was ausgeführt wurde, wo es hakt | Fortschritt sichtbar am eigenen Plan | Lesestatus, Ausführung, Feedback — **Profilüberwachung über den Plan**, nicht über eine zweite Akte in Plan |

**Profilüberwachung** heißt hier: Coach sieht am Plan-Kontext, ob der Klient angekommen ist und mitzieht — nicht, dass Plan die volle Klientenakte (Anamnese, Billing, Messwerte) besitzt. Akte = Coach; Logging-Alltag = Fitness; **Brücke und Sichtbarkeit am zugestellten Plan = Plan**.

**Noch nicht ganz so:** Auth/UID allein reicht nicht → lokaler Klient + freigegebener Plan + Handy-Sichtbarkeit müssen ein durchgängiger Pfad sein. Profile ohne Plan sind kein Onboarding.

---

## Was Plan ist

| Plan ist | Plan ist nicht |
| --- | --- |
| Geteiltes **Modul** (UI + Verträge) für Coach- und Athlet-Oberflächen | Eigenes Local-Backend / zweite Coach-App |
| Quelle für Editor, Plan-Dokument, Versionierung, Feedback | Owner von Klientenakten, Anamnese, Billing |
| Die Brücke, über die Vorgaben **zugestellt** und **gelesen** werden | Der Ort, an dem der Athlet sein ganzes Leben loggt (das ist Fitness) |
| Einbettbar in Coach (Schmiede) und Fitness (Klient) + optional Standalone | Konkurrent zu `fitness-dev` oder `coach-dev` |

**Rolle = Zugangsmodus, nicht App-Identität.**
Derselbe Plan-Baustein: als Coach schreibst und freigibst du; als Athlet liest, bestätigst und trainierst du.

---

## Die vier Kernobjekte

Alles Produkt-Denken hängt an diesen vier Dingen. Features ohne Bezug dazu sind Sand.

### 1. Plan-Dokument (das Artefakt)

Ein lesbares, versionierbares Dokument:

- Trainingstage → Übungen → Vorgaben (Sätze, Reps/Dauer, Gewicht, Pause, RIR, Hinweise)
- Optional: Wochenrahmen, Dauer, Coach-Hinweis an den Klienten
- Später denselben Vertrag für **Ernährung** (Mahlzeiten/Makros/Regeln) — eigener Domain-Inhalt, gleiches Zustell-Muster

Das Dokument muss auf dem Handy **sofort verständlich** sein. Druck/PDF ist Ableitung, nicht Ersatz.

### 2. Entwurf vs. Freigabe (Git-Mentalmodell)

| Zustand | Sichtbarkeit |
| --- | --- |
| **Entwurf / Arbeitsstand** | nur Coach (und lokal am Gerät des Bearbeiters) |
| **Veröffentlichte Version `vN`** | Athlet sieht genau diesen Snapshot |

- Freigabe = Commit mit Nachricht.
- Neue Coach-Edits ändern den Live-Stand des Athleten **nicht**, bis erneut freigegeben wird.
- Historie bleibt; Restore = Checkout des Arbeitsstands, danach neu freigeben.

Ohne diese Trennung gibt es kein Vertrauen — weder für Coach („ich kann noch tippen“) noch für Athlet („was gilt heute?“).

### 3. Zustellung (Delivery)

Pfad in einem Satz:

```text
Coach wählt Klienten → gestaltet Plan → Entwurf sichern → Version freigeben
  → Athlet öffnet App (Fitness/Plan) → sieht „Neu vom Coach“ → liest Plan
```

Push, Banner, Lesebestätigung sind Verstärker. Die Pflicht ist: **nach Freigabe ist der Plan auf dem Gerät des Athleten erreichbar.**

### 4. Dialog (Feedback)

Am freigegebenen Plan, **versiongebunden**:

- Athlet: Empfang bestätigen, Frage/Notiz
- Coach: lesen, antworten
- Workout-Feedback (Anstrengung, Notiz nach der Einheit) fließt in denselben Coach↔Athlet-Kanal, gehört aber zum Ausführungs-Log

Kein zweites Chat-Produkt. Der Plan ist der Kontext der Unterhaltung.

---

## Ownership-Karte (Fundament)

```text
┌─────────────┐     Plan-Modul (dieses Repo)      ┌──────────────┐
│  coach-dev  │◄──── Editor · Dokument · vN ─────►│ fitness-dev  │
│  Schmiede   │     Feedback · Katalog-UI         │ Athlet-PWA   │
│  Klienten,  │                                   │ Session-Log, │
│  Local API, │                                   │ Habits, …    │
│  Zuweisung  │                                   │              │
└─────────────┘                                   └──────────────┘
        │                                                  │
        └──────────── Firestore / Rules (VitalOS) ─────────┘
```

| Bereich | Owner |
| --- | --- |
| Geteilte Plan-UI & Verträge | **plan-dev** |
| Schmieden für andere User, Local-Backend, Klientenakte | **coach-dev** |
| Tägliches Logging, Athlet-Shell, Habit/Journal-Fläche | **fitness-dev** |
| Ernährung als Domain | **fuel-dev** — Plan darf zugestellte Ernährungspläne **zeigen**, nicht Fuel ersetzen |
| Firestore Rules, Shell-Pins | **vitalos** |

Details der Einbindung: [PLAN-COACH-INTEGRATION.md](PLAN-COACH-INTEGRATION.md).
Bedienung: [PLAN-WORKFLOW.md](PLAN-WORKFLOW.md). Feedback-Vertrag: [PLAN-FEEDBACK.md](PLAN-FEEDBACK.md).

---

## Architekturprinzipien (nicht verhandelbar)

1. **Ein Artefakt, zwei Sichten.** Kein zweiter Editor in Coach; kein paralleler „Klienteneditor“ in Fitness.
2. **Host injiziert Identität und Persistenz.** Plan bleibt einbettbar (Firebase-Host, Local-Backdoor, Standalone). Keine geheime Firebase-Abhängigkeit im Editor-Kern.
3. **Snapshot-Integrität.** Veröffentlichte Vorgaben und abgeschlossene Workouts sind Snapshots. Vorlagen-Edits ändern Vergangenheit nicht.
4. **Statische Imports.** Kein `React.lazy` / dynamisches `import()` für Views — Fitness bindet Plan ein; Preload-Marker töten sonst den Tab.
5. **Simplicity.** Happy Path vor Feature-Tiefe. Was den Raphael-Loop nicht verkürzt oder absichert, wartet.
6. **Fork-Schuld nicht ausbauen.** Backendartiges in diesem Repo gehört nach Coach; hier nur Brücken-UI und Verträge.

---

## Nordstern-Flows

### A — Coach stellt Trainingsplan bereit (Pflicht-Pfad)

1. Klient existiert und ist dem Coach zugeordnet.
2. Coach öffnet Schmiede (Coach-App oder Local `…/coach/local.html`).
3. Plan gestalten → Entwurf sichern → **bereitstellen** mit Versionsnotiz.
4. Athlet öffnet Fitness/Plan am Handy → Plan sichtbar → optional Empfang bestätigen.
5. Athlet startet Einheit / loggt → Coach sieht Ausführung und Feedback.

**Akzeptanz:** Raphael kann denselben Abend den freigegebenen Entwurf auf dem Handy lesen.

### B — Athlet trainiert aus dem Plan

Plan liefert die Vorgabe; Fitness/Plan-Logger die Ausführung.
„Erledigt“ bezieht sich auf veröffentlichte Einheiten, nicht auf Coach-Entwürfe.

### C — Ernährung (später, gleiches Muster)

Nicht: Fuel in Plan reinziehen.
Sondern: zugestellter Ernährungsplan als zweites Artefakt denselben Delivery-/Feedback-Vertrag nutzen.

---

## Was der Ist-Zustand erklärt (ehrlich)

Plan ist zwischen Fitness-Fork und Coach-Einbettung **dahinmutiert**, bevor dieses Fundament schriftlich stand:

- Viel Oberfläche und Drill-Logik rund um Logging, Mikrozyklen, Session-Gates
- Ownership-Docs und Workflows existieren — aber ohne eine kurze Vision, die Priorität erzwingt
- Gefühl: Haus mit vielen Zimmern, Fundament unklar → Unzufriedenheit trotz Features

Das ist kein Aufruf zum Abriss. Es ist der Maßstab für Entscheidungen:

> Verkürzt oder härtet dieses Change den Loop **Entwurf → Freigabe → Handy des Athleten → Feedback**?
> Sonst: zurückstellen oder in Coach/Fitness verschieben.

---

## Erfolg in einer Woche / einem Quartal

**Diese Woche (Raphael):**

- [ ] Klient Raphael im Coach-Kontext anlegen/zuordnen (fehlt ggf. noch unter `~/.local/Klienten`)
- [ ] Ersten Trainingsplan entwerfen und als Version freigeben
- [ ] Raphael sieht den Plan am Handy (Fitness- oder Plan-Surface, authentifiziert)
- [ ] Optional: Empfangsbestätigung + eine Rückmeldungszeile

**Dieses Quartal:**

- Delivery-Pfad (Cloud) stabil und gerätegeprüft
- Feedback am Plan alltagstauglich
- Ernährungs-Artefakt spezifiziert (noch nicht gebaut), ohne Ownership-Chaos
- Bewusste Reduktion: Fork-Reste und Features ohne Bezug zu den vier Kernobjekten abbauen oder auslagern

---

## Anti-Ziele

- Keine Anatomie-/Ausbildungs-Tempel-Vision in diesem Repo (gehört Fitness/Catalog)
- Kein Ausbau von Local-Backend in plan-dev
- Kein dritter vollständiger App-Kosmos „neben“ Coach und Fitness
- Kein stilles Vermischen von Entwurf und Live-Stand
- Keine Feature-Arbeit, die den Raphael-Happy-Path ersetzt

---

## Verwandte Docs

| Doc | Rolle |
| --- | --- |
| [PLAN-COACH-INTEGRATION.md](PLAN-COACH-INTEGRATION.md) | Ownership, Pointer, Datenverträge |
| [PLAN-WORKFLOW.md](PLAN-WORKFLOW.md) | Bedienung Coach/Athlet |
| [PLAN-FEEDBACK.md](PLAN-FEEDBACK.md) | Empfang & Dialog |
| `src/views/Plan/ARCHITECTURE.md` | Implementierungsstand Plan-View |
| `~/dev/coach-dev/docs/LOCAL-PLANNING.md` | Laptop-Schmiede ohne Firebase |

---

*Vision ist der Maßstab. Workflow- und Integrations-Docs beschreiben den aktuellen Weg dorthin.*
