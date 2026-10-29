#!/usr/bin/env bash
set -euo pipefail

# `fitness`: integrate Plan dev into Fitness and push the Fitness gitlink.
# `vos`: release the standalone Plan app through the VitalOS release workflow.

PLAN_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FITNESS_REPO="${FITNESS_DEV_REPO:-$HOME/fitness-dev}"
MODE="${1:-fitness}"
OLD_PLAN_SHA=""
PIN_UPDATED=false
KEEP_PIN=false

fail() {
  echo "deploy:fitness: $*" >&2
  exit 1
}

if [[ "$MODE" == "vos" ]]; then
  VOS_RELEASE="${VOS_RELEASE_BIN:-$HOME/vitalos/bin/vos-release}"
  [[ -x "$VOS_RELEASE" ]] || fail "vos-release not found or not executable at $VOS_RELEASE (override with VOS_RELEASE_BIN)."
  exec "$VOS_RELEASE" plan
elif [[ "$MODE" == "fitness" ]]; then
  # Seit 2026-10-29 trägt Fitness Plan nicht mehr als Gitlink: der Fitness-Build löst Plan über den
  # Nachbar-Checkout auf (~/plan-dev bzw. plan-app im vitalos-Workspace). Release = vos-release plan.
  echo "deploy:fitness: Fitness pinnt Plan nicht mehr (kein Gitlink). Nutze '$0 vos' bzw. 'vos-release plan'." >&2
  exit 1
else
  fail "Unknown target '$MODE'. Use 'vos'."
fi

command -v git >/dev/null || fail "git is required."
command -v pnpm >/dev/null || fail "pnpm is required."
[[ -d "$FITNESS_REPO/.git" || -f "$FITNESS_REPO/.git" ]] || fail "Fitness repo not found at $FITNESS_REPO (override with FITNESS_DEV_REPO)."

[[ "$(git -C "$PLAN_REPO" branch --show-current)" == "dev" ]] || fail "Plan must be checked out on branch dev."
[[ -z "$(git -C "$PLAN_REPO" status --porcelain)" ]] || fail "Plan working tree must be clean. Commit or stash changes first."

git -C "$PLAN_REPO" fetch origin
PLAN_SHA="$(git -C "$PLAN_REPO" rev-parse HEAD)"
ORIGIN_DEV_SHA="$(git -C "$PLAN_REPO" rev-parse refs/remotes/origin/dev)"
[[ "$PLAN_SHA" == "$ORIGIN_DEV_SHA" ]] || fail "Plan dev must be pushed and up to date with origin/dev before integration."

[[ "$(git -C "$FITNESS_REPO" branch --show-current)" == "dev" ]] || fail "Fitness must be checked out on branch dev."
[[ -z "$(git -C "$FITNESS_REPO" status --porcelain)" ]] || fail "Fitness working tree must be clean."
git -C "$FITNESS_REPO" fetch origin
FITNESS_SHA="$(git -C "$FITNESS_REPO" rev-parse HEAD)"
FITNESS_ORIGIN_SHA="$(git -C "$FITNESS_REPO" rev-parse refs/remotes/origin/dev)"
[[ "$FITNESS_SHA" == "$FITNESS_ORIGIN_SHA" ]] || fail "Fitness dev must be synced with origin/dev before integration."

# Plan and Fitness each use their own dev branch. Fitness consumes Plan through
# the Gitlink, which must pin the exact revision selected for this integration.
PLAN_SUBMODULE_BRANCH="$(git -C "$FITNESS_REPO" config -f "$FITNESS_REPO/.gitmodules" submodule.plan.branch || true)"
[[ "$PLAN_SUBMODULE_BRANCH" == "dev" ]] || fail "Fitness .gitmodules must declare plan branch=dev (found '${PLAN_SUBMODULE_BRANCH:-unset}')."

git -C "$FITNESS_REPO" submodule update --init --recursive
OLD_PLAN_SHA="$(git -C "$FITNESS_REPO" rev-parse HEAD:plan)"
restore_plan_pin() {
  if [[ "$PIN_UPDATED" == true && "$KEEP_PIN" != true ]]; then
    git -C "$FITNESS_REPO" reset -- plan >/dev/null 2>&1 || true
    git -C "$FITNESS_REPO/plan" checkout --detach "$OLD_PLAN_SHA" >/dev/null 2>&1 || true
  fi
}
trap restore_plan_pin EXIT

git -C "$FITNESS_REPO/plan" fetch origin dev
git -C "$FITNESS_REPO/plan" checkout --detach "$PLAN_SHA"
PINNED_SHA="$(git -C "$FITNESS_REPO/plan" rev-parse HEAD)"
[[ "$PINNED_SHA" == "$PLAN_SHA" ]] || fail "Fitness Plan submodule did not check out the requested revision."
PIN_UPDATED=true

echo "Building Fitness with Plan $PINNED_SHA …"
(cd "$FITNESS_REPO" && pnpm run build:firebase)

git -C "$FITNESS_REPO" add plan
if git -C "$FITNESS_REPO" diff --cached --quiet -- plan; then
  echo "Fitness already pins Plan $PINNED_SHA; no Fitness commit is needed."
  exit 0
fi

git -C "$FITNESS_REPO" commit -m "chore(fitness): update Plan integration"
KEEP_PIN=true
git -C "$FITNESS_REPO" push origin dev

echo "Fitness dev now pins Plan $PINNED_SHA. The Fitness push/CI flow has been started."
