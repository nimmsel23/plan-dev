#!/usr/bin/env bash
# Plan is a build-time mini-app, not the Fitness localhost service.
set -euo pipefail
printf '%s\n' 'Plan has no standalone /opt backend deployment.' 'Its frontend is bundled by the consuming app. Deploy Fitness from fitness-dev/deploy.sh.' >&2
exit 1
