#!/usr/bin/env bash
# deploy.sh — Versioned deployment for Fitness (staging/prod FastAPI server)
set -euo pipefail

# Default to staging target
TARGET="${1:-staging}"
BUILD_BEFORE_DEPLOY=false

shift_count=0
if [[ $# -gt 0 ]]; then
  shift_count=1
fi
if [[ $shift_count -gt 0 ]]; then
  shift
fi

for arg in "$@"; do
  case "$arg" in
    --build-yes)
      BUILD_BEFORE_DEPLOY=true
      ;;
    *)
      printf '\033[1;31m%s\033[0m\n' "Invalid argument '$arg'. Supported: --build-yes" >&2
      exit 1
      ;;
  esac
done

if [[ "$TARGET" == "prod" ]]; then
  DEST="/opt/fitness"
  BACKUP_DIR="/opt/fitness_backups"
  SERVICE="fitness.service"
  USE_SUDO=true
  PORT=6100
elif [[ "$TARGET" == "staging" ]]; then
  DEST="$HOME/.local/fitness"
  BACKUP_DIR="$HOME/.local/fitness_backups"
  SERVICE="fitness-preview.service"
  USE_SUDO=false
  PORT=8100
else
  printf '\033[1;31m%s\033[0m\n' "Invalid target '$TARGET'. Use: staging | prod" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$(realpath "${BASH_SOURCE[0]}")")" && pwd)"
DEV_SOURCE="${HOME}/fitness-dev"
STAGING_SOURCE="${HOME}/.local/fitness"

msg() { printf '\033[1;32m%s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m%s\033[0m\n' "$*" >&2; }
die() { printf '\033[1;31m%s\033[0m\n' "$*" >&2; exit 1; }

require_file() {
  local path="$1"
  local label="${2:-$1}"
  [[ -f "$path" ]] || die "❌ Missing $label at $path"
  msg "✅ $label present: $path"
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-20}"
  local sleep_s="${4:-1}"
  local body=""
  local i

  for ((i = 1; i <= attempts; i++)); do
    if body="$(curl -fsS --max-time 2 "$url" 2>/dev/null)"; then
      msg "✅ $label healthy: $url"
      printf '%s\n' "$body"
      return 0
    fi
    sleep "$sleep_s"
  done

  die "❌ $label did not become healthy: $url"
}

systemd_status() {
  local action="$1"
  shift
  if $USE_SUDO; then
    sudo systemctl "$action" "$@"
  else
    systemctl --user "$action" "$@"
  fi
}

systemd_list_unit_files() {
  local unit="$1"
  if $USE_SUDO; then
    systemctl list-unit-files "$unit"
  else
    systemctl --user list-unit-files "$unit"
  fi
}

print_systemd_failure_context() {
  local unit="$1"
  warn "⚠️ systemd status for $unit"
  if $USE_SUDO; then
    sudo systemctl status "$unit" --no-pager || true
    warn "⚠️ recent journal for $unit"
    sudo journalctl -u "$unit" -n 40 --no-pager || true
  else
    systemctl --user status "$unit" --no-pager || true
    warn "⚠️ recent journal for $unit"
    journalctl --user -u "$unit" -n 40 --no-pager || true
  fi
}

if [[ "$TARGET" == "staging" ]]; then
  SOURCE="$SCRIPT_DIR"
  if [[ "$SCRIPT_DIR" != "$DEV_SOURCE" && -f "$DEV_SOURCE/package.json" ]]; then
    SOURCE="$DEV_SOURCE"
  fi
elif [[ "$TARGET" == "prod" ]]; then
  SOURCE="$SCRIPT_DIR"
  if [[ "$SCRIPT_DIR" != "$STAGING_SOURCE" && -f "$STAGING_SOURCE/package.json" ]]; then
    SOURCE="$STAGING_SOURCE"
  fi
fi

[[ -f "$SOURCE/package.json" ]] || die "Deployment source '$SOURCE' is not a fitness checkout"

run_cmd() {
  if $USE_SUDO; then
    sudo "$@"
  else
    "$@"
  fi
}

msg "🚀 Starting Fitness Deployment to $TARGET ($DEST)"
msg "📍 Using source checkout $SOURCE"

# Build-Strategie: --build-yes erzwingt einen frischen Build. Ohne Flag gilt
# beim Prod-Deploy aus dem Staging-Checkout (SOURCE == STAGING_SOURCE) die
# Ausnahme — $SOURCE/dist wurde bereits beim vorherigen staging-Deploy gebaut,
# kein doppelter Build nötig, nur übernehmen und weiterreichen an prod. In
# allen anderen Fällen ohne Flag wird das vorhandene dist/ unverändert
# übernommen (mit Warnung, damit ein veraltetes dist/ nicht unbemerkt bleibt).
if $BUILD_BEFORE_DEPLOY; then
  msg "🔨 Building UI in $SOURCE"
  (
    cd "$SOURCE"
    pnpm run build > /dev/null
  )
elif [[ "$TARGET" == "prod" && "$SOURCE" == "$STAGING_SOURCE" && -d "$SOURCE/dist" ]]; then
  msg "⏭️  Build übersprungen — nutze bereits vorhandenes $SOURCE/dist (aus dem staging-Deploy)"
elif [[ ! -d "$SOURCE/dist" ]]; then
  warn "⚠️ No dist/ directory found in $SOURCE. Deploy will use the current checkout state without building."
else
  dist_mtime=$(stat -c '%y' "$SOURCE/dist" 2>/dev/null | cut -d'.' -f1 || true)
  if [[ -n "$dist_mtime" ]]; then
    warn "⚠️ Deploying existing dist/ from $dist_mtime (no build was run)."
  else
    warn "⚠️ Deploying existing dist/ without rebuild (timestamp unavailable)."
  fi
fi

# 1. Versioned Backup (nur prod — staging ist ein reiner Preview-Checkout,
# der jederzeit aus $SOURCE neu synced werden kann)
if [[ "$TARGET" == "prod" && -d "$DEST" ]]; then
  timestamp=$(date +%Y%m%d_%H%M%S)
  backup_path="$BACKUP_DIR/fitness_$timestamp"
  msg "📦 Creating versioned backup: $backup_path"
  run_cmd mkdir -p "$BACKUP_DIR"
  run_cmd cp -a "$DEST" "$backup_path"
fi

# 2. Sync to target directory
if [[ ! -d "$DEST" ]]; then
  msg "📂 Creating target directory $DEST"
  run_cmd mkdir -p "$DEST"
  if $USE_SUDO; then
    run_cmd chown "$(id -u):$(id -g)" "$DEST"
  fi
fi

RSYNC_EXCLUDES=(
  --exclude ".git"
  --exclude ".env"
  --exclude ".env.*"
  --exclude "node_modules"
  --exclude "data"
  --exclude ".archiv"
  --exclude "*.bak"
  --exclude ".claude"
  --exclude "*.log"
  --exclude ".firebase"
  --exclude "dist-firebase"
  --exclude "dist-versions"
  --exclude ".worktrees"
  --exclude "catalog-ui"
  --exclude "gas-coach-summary"
  --exclude "__pycache__"
  --exclude ".pytest_cache"
  --exclude ".venv"
  --exclude "fitness/catalog/state"
  --exclude "fitness/catalog/kb"
  # free-exercise-db liegt manuell unter $DEST (~/.local/fitness), existiert aber
  # nicht in $SOURCE (~/fitness-dev) — ohne diesen Exclude loescht --delete
  # bei jedem Staging-Deploy den kompletten Klon bis auf .git leer (Root
  # Cause fuer den "yuhonas-Repo wird nach dem Import geleert"-Bug,
  # 2026-08-15 gefunden). Siehe fitness/catalog/CLAUDE.md.
  --exclude "free-exercise-db"
)

msg "📦 Syncing files from $SOURCE → $DEST"
# fitness-enricher.service/fitness-firestore-daemon.service schreiben live in
# fitness/catalog/kb/** während der Sync läuft — rsync bricht das einzelne
# betroffene File dann mit "vanished"/geändert ab und meldet exit code 23
# (teilweise übertragen), obwohl der Rest sauber lief. set -e würde den
# gesamten Deploy hier sonst stillschweigend abbrechen, bevor Service-Setup
# + Restart passieren. Exit 23/24 daher als Warnung behandeln, alles andere
# bleibt fatal.
set +e
if $USE_SUDO; then
  sudo rsync -av --delete "${RSYNC_EXCLUDES[@]}" "$SOURCE/" "$DEST/"
else
  rsync -av --delete "${RSYNC_EXCLUDES[@]}" "$SOURCE/" "$DEST/"
fi
rsync_rc=$?
set -e
if [[ $rsync_rc -eq 23 || $rsync_rc -eq 24 ]]; then
  warn "⚠️  rsync meldet Code $rsync_rc (einzelne Dateien während des Syncs live verändert/verschwunden, z.B. durch fitness-enricher.service) — nicht fatal, Deploy läuft weiter."
elif [[ $rsync_rc -ne 0 ]]; then
  die "rsync fehlgeschlagen mit Code $rsync_rc"
fi

msg "🩺 Verifying deployed artifacts"
require_file "$DEST/package.json" "fitness checkout manifest"
require_file "$DEST/pyproject.toml" "python project manifest"
require_file "$DEST/dist/index.html" "built frontend dist"

# 2b. kb/ wird NICHT kopiert (siehe Exclude oben), sondern nach dem
# Venv-Build (Schritt 3) direkt aus dem Dev-Repo verlinkt — dieselbe
# Datei-Basis wie fitness/catalog/state, nur fuer den Katalog selbst. Grund:
# kb/ ist Content (Coach-Approvals, Gemini-Enrichment, Firestore-Merges),
# keine versionierte App-Code-Aenderung — soll sofort ueberall sichtbar sein
# statt erst beim naechsten Deploy. Nebeneffekt: behebt auch das
# exit-23/24-Problem oben fuer kb/ endgueltig, da rsync diesen Pfad gar
# nicht mehr anfasst.
#
# WICHTIG: Der Symlink darf erst NACH `uv pip install .` gesetzt werden -
# poetry-core (Wheel-Build-Backend) läuft beim Packagen in fitness/catalog/
# hinein und crasht hart (ValueError in relative_to_project_root()), sobald
# es dort auf einen Symlink trifft, dessen Ziel außerhalb des Projekt-Roots
# liegt (~/fitness-dev statt ~/.local/fitness) - das pyproject.toml-exclude greift
# dabei zu spät, der Fehler passiert schon beim Datei-Discovery davor. Bis
# zum pip-install-Schritt existiert kb/ hier also noch gar nicht (rsync hat
# es ja ausgeschlossen) - kein Konflikt.
#
# Gleiches Problem betrifft fitness/catalog/state (Symlink -> ~/.aos/fitness/
# agent-state, existiert seit 2026-07-11) - fiel nie auf, weil fitness.service
# bis zur :6100-Python-Migration Node war und dieser venv-Build-Schritt fuer
# den laufenden Prod-Service irrelevant war. Beide Symlinks brauchen dieselbe
# "erst nach dem Build setzen"-Behandlung.
KB_LINK="$DEST/fitness/catalog/kb"
KB_SOURCE="$DEV_SOURCE/fitness/catalog/kb"
STATE_LINK="$DEST/fitness/catalog/state"
STATE_SOURCE="$HOME/.aos/fitness/agent-state"
run_cmd rm -rf "$KB_LINK" "$STATE_LINK"

# 3. Finalize Python Environment — Create .venv and install dependencies via uv
msg "📦 Setting up Python virtual environment in $DEST"
(
  cd "$DEST"
  if command -v uv &> /dev/null; then
    uv venv --clear --quiet
    uv pip install . --quiet
  else
    python3 -m venv .venv
    ./.venv/bin/python3 -m pip install --upgrade pip --quiet
    ./.venv/bin/python3 -m pip install . --quiet
  fi
)

msg "🔗 Verlinke kb/ live aus $KB_SOURCE (kein Sync-Lag mehr)"
run_cmd ln -s "$KB_SOURCE" "$KB_LINK"
msg "🔗 Verlinke catalog/state aus $STATE_SOURCE"
run_cmd ln -s "$STATE_SOURCE" "$STATE_LINK"
if [[ ! -L "$KB_LINK" || ! -L "$STATE_LINK" ]]; then
  die "❌ Expected live symlinks for kb/state after deploy"
fi
msg "✅ Live symlinks for kb/ and state/ verified"

# 3b. Systemd-Unit sicherstellen (staging + prod, beide inline hier statt
# extern getrackt — staging lag vorher via ~/.dotfiles-Symlink, prod-Inhalt
# war dupliziert in fitness-prodctl). Diff-Check vor dem Schreiben, damit
# ein unveraendertes deploy.sh-staging/-prod nicht bei jedem Lauf einen
# unnoetigen daemon-reload ausloest.
if [[ "$TARGET" == "staging" ]]; then
  UNIT_PATH="$HOME/.config/systemd/user/$SERVICE"
  UNIT_CONTENT="[Unit]
Description=Fitness Centre Preview Service (FastAPI :$PORT)
After=network.target

[Service]
Type=simple
WorkingDirectory=$DEST
ExecStart=$DEST/.venv/bin/python3 -m uvicorn fitness.api.main:app --host 127.0.0.1 --port $PORT --no-access-log
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=FITNESS_ENV=staging
Environment=FITNESS_PYTHON_PORT=$PORT
Environment=FITNESS_DATA_DIR=$HOME/.aos/fitness
Environment=FITNESS_SKIP_WATCHERS=1

[Install]
WantedBy=default.target
"
elif [[ "$TARGET" == "prod" ]]; then
  UNIT_PATH="/etc/systemd/system/$SERVICE"
  UNIT_CONTENT="[Unit]
Description=Fitness Prod App (Python/FastAPI, serves API + built frontend from /opt/fitness)
After=network.target

[Service]
Type=simple
User=alpha
WorkingDirectory=$DEST
ExecStart=$DEST/.venv/bin/python -m uvicorn fitness.api.main:app --host 0.0.0.0 --port $PORT --no-access-log
Restart=on-failure
RestartSec=2
Environment=FITNESS_ENV=prod
Environment=FITNESS_PYTHON_PORT=$PORT
Environment=FITNESS_SKIP_WATCHERS=1
EnvironmentFile=-/etc/aos/fitness.env

[Install]
WantedBy=multi-user.target
"
fi

if [[ "$(cat "$UNIT_PATH" 2>/dev/null || true)" == "$(printf '%s' "$UNIT_CONTENT")" ]]; then
  msg "🧩 Unit $SERVICE bereits aktuell"
else
  msg "🧩 Schreibe/aktualisiere systemd Unit $SERVICE"
  if $USE_SUDO; then
    printf '%s\n' "$UNIT_CONTENT" | sudo tee "$UNIT_PATH" >/dev/null
  else
    mkdir -p "$(dirname "$UNIT_PATH")"
    printf '%s\n' "$UNIT_CONTENT" > "$UNIT_PATH"
  fi
fi

# 4. Restart Service
if $USE_SUDO; then
  if systemctl list-unit-files "$SERVICE" >/dev/null 2>&1; then
    msg "🔄 Restarting system-scope $SERVICE (sudo)"
    sudo systemctl daemon-reload
    sudo systemctl restart "$SERVICE"
  else
    warn "⚠️ System-scope $SERVICE not found. Skipping restart."
  fi
else
  if systemd_list_unit_files "$SERVICE" >/dev/null 2>&1; then
    msg "🔄 Restarting user-scope $SERVICE"
    systemctl --user daemon-reload
    systemctl --user restart "$SERVICE"
  else
    warn "⚠️ User-scope $SERVICE not found. Skipping restart."
  fi
fi

msg "🩺 Verifying runtime on :$PORT"
if systemd_list_unit_files "$SERVICE" >/dev/null 2>&1; then
  if ! systemd_status is-active --quiet "$SERVICE"; then
    print_systemd_failure_context "$SERVICE"
    die "❌ $SERVICE is not active after deploy"
  fi
fi

wait_for_http "http://127.0.0.1:$PORT/health" "Fitness $TARGET health" >/dev/null

msg "✅ Deployment to $DEST complete on port $PORT."
