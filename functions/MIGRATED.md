# Functions gehören zum gemeinsamen Backend

Kanonische Quellen: `~/dev/backend/functions/fitness`.
Deployment-Owner: `~/dev/backend/firebase.json`, Codebase `fitness`.

`onPlanPublished` (Plan-Push an Klienten) liegt dort neben den übrigen
Fitness-Push-Functions. Strava bleibt Fitness-PWA-only im Backend — Plan und
Coach brauchen es nicht.

Neue Fachänderungen ausschließlich im Backend. Dieses Verzeichnis hält keine
ausführbaren Function-Quellen mehr.
