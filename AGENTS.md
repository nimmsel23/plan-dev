# Plan development and Fitness integration

- `~/plan-dev` on `dev` is the canonical working checkout and source repository for the Plan mini-app.
- When Plan view files under `src/views/Plan/` are pushed from `plan-dev/dev`, its pre-push hook calls `fitness-dev/scripts/publish-mini-app-to-fitness.mjs`. The publisher copies those files into `fitness-dev/src/views/Plan/`, builds the Fitness bundle, commits the integrated view, and pushes `fitness-dev/dev`; Fitness CI then deploys the preview.
- `fitness-dev/src/views/Plan/` is the integrated Fitness copy. The old `fitness-dev/plan` submodule is not part of the current integration and must not be treated as the Plan development checkout.
- Fitness production follows `fitness-dev/dev` -> `~/vitalos/fitness-app` branch `vitalos` -> the `fitness-app` Gitlink in `~/vitalos` branch `master`. Fitness CI deploys standalone Fitness production; VitalOS CI deploys the shell with its pinned app sources.
- The Plan app deployed from `~/vitalos/plan-app` is a separate standalone shell app. Keep that release target distinct from Plan's Fitness-view sync.
