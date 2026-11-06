# Auto-Promote dev -> master

Pushes auf `dev` bleiben nicht liegen: nach grünem `Check (Plan)` zieht `.github/workflows/automerge.yml` `master` per Fast-Forward auf `dev` und startet den Live-Deploy per Dispatch. Ist `dev` hinter `master`, wird `dev` nachgezogen. Direkte Pushes auf `master` vermeiden (Divergenz, der Workflow läuft rot). Vorlage: `vitalos-prod/docs/product-dev/ci-auto-promote/`.
