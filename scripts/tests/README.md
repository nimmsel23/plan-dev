# Plan validation

Run `npm run test:plan` for pure data/draft tests, the real Firestore adapters
against an in-memory double, the generic Node API proxy, and Python router tests using temporary data.
The JS adapter test uses Node's `registerHooks` (Node 22.15+).
The Python test substitutes runtime configuration before importing routers;
it does not open the real user database. Its test-only threadpool shim avoids
AnyIO worker wakeup hangs observed under the restricted Python 3.14 sandbox.

Run `aos-kitty-launch npm run test:plan:browser` for an isolated browser walkthrough.
Requires Python FastAPI/uvicorn, Node, curl, and a Chromium executable
(`PLAN_TEST_BROWSER`, default `/opt/thorium-browser-avx2/thorium`).
It uses temporary ports 15902, 15915 and 19222; leave them free first.
The browser has a separate temporary profile. Backend records live only in a
TemporaryDirectory. Tests never import production runtime config.
Logs are retained in the printed temporary folder; a mobile screenshot is at
`/tmp/plan-browser-mobile.png`. All three processes exit with the runner.

The browser harness uses the real components and local adapters, with fake
local auth identities for coach/client. It validates interaction and local
persistence, not Firebase authentication or access rules. Firestore adapter
behavior is tested separately with the in-memory double. A genuine authenticated
Coach/client Cloud walkthrough is still required before claiming Cloud acceptance.

`plan-browser.html` and `browser-db.js` are test-only Vite inputs. Release builds
continue to use `plan.html` and the production `@db` alias.
