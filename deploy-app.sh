#!/usr/bin/env bash
set -euo pipefail

# Integrate the reviewed Plan dev revision into Fitness and push the resulting
# Fitness gitlink update. This does not deploy the standalone Plan app.

PLAN_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FITNESS_REPO="${FITNESS_DEV_REPO:-$HOME/fitness-dev}"
TMP_ROOT=""

fail() {
  echo "deploy:fitness: $*" >&2
  exit 1
}

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

# Merge Plan dev in a temporary detached worktree so the user's Plan checkout
# stays on dev. The integration branch remains an explicit, pushed revision.
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/plan-fitness-deploy.XXXXXX")"
cleanup() {
  if [[ -n "$TMP_ROOT" ]]; then
    git -C "$PLAN_REPO" worktree remove --force "$TMP_ROOT/plan" >/dev/null 2>&1 || true
    rm -rf "$TMP_ROOT"
  fi
}
trap cleanup EXIT

git -C "$PLAN_REPO" worktree add --detach "$TMP_ROOT/plan" refs/remotes/origin/fitness
git -C "$TMP_ROOT/plan" merge --no-edit "$PLAN_SHA"
INTEGRATION_SHA="$(git -C "$TMP_ROOT/plan" rev-parse HEAD)"
git -C "$PLAN_REPO" push origin "$INTEGRATION_SHA:refs/heads/fitness"

# Pin Fitness to the exact commit just published on Plan's fitness branch.
git -C "$FITNESS_REPO" submodule update --init --recursive
git -C "$FITNESS_REPO/plan" fetch origin fitness
git -C "$FITNESS_REPO/plan" checkout --detach "$INTEGRATION_SHA"
PINNED_SHA="$(git -C "$FITNESS_REPO/plan" rev-parse HEAD)"
[[ "$PINNED_SHA" == "$INTEGRATION_SHA" ]] || fail "Fitness Plan submodule did not check out the requested revision."

echo "Building Fitness with Plan $PINNED_SHA …"
(cd "$FITNESS_REPO" && pnpm run build:firebase)

git -C "$FITNESS_REPO" add plan
if git -C "$FITNESS_REPO" diff --cached --quiet -- plan; then
  echo "Fitness already pins Plan $PINNED_SHA; no Fitness commit is needed."
  exit 0
fi

git -C "$FITNESS_REPO" commit -m "chore(fitness): update Plan integration"
git -C "$FITNESS_REPO" push origin dev

echo "Fitness dev now pins Plan $PINNED_SHA. The Fitness push/CI flow has been started."
