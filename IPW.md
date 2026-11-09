# IPW — plan-dev (perfekte Brücken-App)

Ideal Parallel World des Plan-Moduls. Horizon: der Editor-Vertrag, den Fitness und
Coach teilen — ohne je ein Backend zu werden.
Stand: 2026-11-09.

## Die eine Szene

Derselbe Editor, zwei Welten: Im Coach schmiedet Daniel einen Zyklus für Matthias;
in Fitness sieht Matthias denselben Vertrag als ausführbaren Plan. Ein Code,
zwei Hosts, null Drift. Speichern heißt Host-Callback — Plan weiß nicht, ob
Firestore oder Laptop-Backdoor dahinterliegt.

## Dominion der App

- **Ein Editor, ein Vertrag** — Programme, Routinen, Versionen, Feedback,
  Snapshots — überall gleich.
- **Pin-Disziplin** — Coach und Fitness konsumieren bewusste Commits; kein
  „Nachbarordner als Wahrheit“.
- **Yuhonas als Atlas** — gepinnte Free-Exercise-DB + CDN; Suche und Bilder
  stabil, kein floating `@main`.
- **Mehrgerät-sicher** — Entwürfe und Starts mit Versionserwartung; Konflikte
  menschlich lösbar.
- **Null Local-Backend** — Persistenz ist Host-Sache (Coach/Fitness/Firebase).

## Was die perfekte App bewusst nicht ist

- Keine `fitnessctl`, kein Catalog-Agent, keine FastAPI.
- Keine zweite Schmiede neben Coach.
- Kein Fitness-Fork-Friedhof im Root.

## Spürbarer Alltag

Coach: Plan öffnen → schmieden → veröffentlichen → zuweisen.  
Klient: Plan-Tab → lesen → starten → Feedback.  
Dev: eine Änderung in plan-dev → Tests → Pin bumpen → beide Welten synchron.

## Messlatte (IPW erreicht wenn…)

1. Kein Feature existiert „nur in Coach“ oder „nur in Fitness“ am gleichen Editor.
2. Pointer-Bump ist Ritual, nicht Notfall.
3. Repo-Root erklärt sich in 30 Sekunden: Editor, Vertrag, Pin, fertig.
4. Fork-Schuld (`runtime/`, Archive) ist weg oder tot und ignoriert.
5. Neue Übung kommt aus KB/Yuhonas-Pin — nie aus einem Plan-eigenen Backend.

## Vom FRAME hierher

Heute: Brücke klar, Reste noch im Keller.  
IPW: reiner Vertragscode — dünn, scharf, überall derselbe.
