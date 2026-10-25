#!/usr/bin/env bash
# Rules-Test gegen den lokalen Firestore-Emulator (Java + ~/.cache/firebase/emulators nötig).
set -euo pipefail
cd "$(dirname "$0")/../.."
CFG="$(mktemp -d)"
printf '{"emulators":{"firestore":{"host":"127.0.0.1","port":8099},"ui":{"enabled":false}}}' > "$CFG/firebase.json"
firebase emulators:exec --only firestore --project demo-plan-rules --config "$CFG/firebase.json" "node scripts/tests/rules.test.mjs"
