#!/usr/bin/env bash
# Start through aos-kitty-launch, as required for interactive/long-lived processes.
set -euo pipefail
cd "$(dirname "$0")/../.."
plan_test_dir=$(mktemp -d /tmp/plan-browser.XXXXXX)
plan_test_browser=${PLAN_TEST_BROWSER:-/opt/thorium-browser-avx2/thorium}
printf 'Isolated test logs: %s\n' "$plan_test_dir"
node scripts/tests/browser-server.mjs > "$plan_test_dir/vite.log" 2>&1 &
plan_vite_pid=$!
python3 scripts/tests/browser_backend.py > "$plan_test_dir/backend.log" 2>&1 &
plan_backend_pid=$!
"$plan_test_browser" --headless --no-sandbox --disable-gpu --remote-debugging-address=127.0.0.1 --remote-debugging-port=19222 --user-data-dir="$plan_test_dir/profile" about:blank > "$plan_test_dir/browser.log" 2>&1 &
plan_browser_pid=$!
cleanup() { kill "$plan_vite_pid" "$plan_backend_pid" "$plan_browser_pid" 2>/dev/null || true; }
trap cleanup EXIT
trap 'exit 130' INT TERM
plan_ready=false
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:19222/json/version >/dev/null 2>&1 && curl -fsS http://127.0.0.1:15915/routines >/dev/null 2>&1 && curl -fsS http://127.0.0.1:15902/scripts/tests/plan-browser.html >/dev/null 2>&1; then plan_ready=true; break; fi
  sleep 1
done
if [[ "$plan_ready" != true ]]; then cat "$plan_test_dir"/*.log; exit 1; fi
node scripts/tests/plan-browser.mjs | tee "$plan_test_dir/result.log"
