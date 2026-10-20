# Plan development and Fitness integration

- `plan-dev` is the independent development repository for the Plan mini-app. Its `dev` branch may contain work that is not ready for the Fitness app or the standalone Plan release.
- Fitness builds must use a specific, committed Plan source revision. Pin that revision in Fitness integration/build configuration; do not resolve the latest `plan-dev/dev` implicitly during a build. This keeps Fitness builds reproducible and lets Fitness remain on a stable Plan revision while standalone Plan work continues.
- Updating the Plan revision used by Fitness is an intentional integration change: update the pin in `fitness-dev`, build and verify Fitness, then commit and push that integration change through the Fitness staging flow.
- Standalone Plan releases are independent of the Plan revision pinned by Fitness. Releasing a standalone Plan build must not silently advance Fitness.
