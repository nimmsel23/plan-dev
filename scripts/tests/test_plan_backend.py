"""Run real Plan routers with a temporary filesystem; never import runtime config."""
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest

from fastapi import FastAPI
import fastapi.routing

# Keep filesystem-only sync endpoints on this loop in the restricted test sandbox.
# AnyIO worker wakeups hang in this environment (Python 3.14); no production patch.
async def direct_threadpool(func, *args, **kwargs):
    return func(*args, **kwargs)

fastapi.routing.run_in_threadpool = direct_threadpool
import asyncio
from httpx import AsyncClient, ASGITransport


class RouterClient:
    def __init__(self, app): self.app = app
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def __getattr__(self, method):
        async def request(path, **kwargs):
            async with AsyncClient(transport=ASGITransport(app=self.app), base_url="http://isolated.test") as client:
                return await client.request(method.upper(), path, **kwargs)
        return lambda path, **kwargs: asyncio.run(request(path, **kwargs))

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))


class PlanBackendTest(unittest.TestCase):
    def test_coach_plan_snapshot_workout_and_client_isolation(self):
        with tempfile.TemporaryDirectory(prefix="plan-router-test-") as root:
            config = types.ModuleType("fitness.api.config")
            config.RUNTIME = Path(root)
            config.SESS_ROOT = Path(root) / "users"

            def read(path):
                return json.loads(path.read_text()) if path.exists() else None

            def write(path, value):
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(json.dumps(value))

            config._read_json = read
            config._write_json = write
            config._uid_from_request = lambda request: request.query_params.get("uid", "client")
            sys.modules["fitness.api.config"] = config
            from fitness.api.routers import workouts, macrocycles
            app = FastAPI()
            app.include_router(workouts.router)
            app.include_router(macrocycles.router)
            app.include_router(workouts.router, prefix="/api")
            app.include_router(macrocycles.router, prefix="/api")
            with RouterClient(app) as client:
                routine_id = client.post("/routines?uid=client", json={"name": "Push"}).json()["id"]
                ex = {"exercise_id": "yuhonas_bench", "name": "Bench", "notes": "Coach cue", "rest_seconds": 0, "instructions": ["Control the bar."], "templateSets": [{"targetReps": "8-12", "targetWeight": 60}]}
                self.assertEqual(client.post(f"/routines/{routine_id}/exercises?uid=client", json=ex).status_code, 200)
                self.assertEqual(client.get("/routines?uid=coach").json()["routines"], [])
                routine = client.get(f"/routines/{routine_id}?uid=client").json()["routine"]
                base = "/fitness/coach/macrocycles/client"
                plan = client.post(base, json={"name": "PPL", "coachUid": "coach", "status": "draft"}).json()["macrocycle"]
                url = f'{base}/{plan["id"]}'
                self.assertEqual(client.patch(url, json={"status": "published"}).status_code, 422)
                added = client.post(f"{url}/routines", json={"label": "Push", "sourceTemplateId": routine_id, "exercises": routine["exercises"]}).json()["macrocycle"]
                self.assertEqual(client.patch("/api" + url, json={"status": "published"}).json()["macrocycle"]["status"], "published")
                wd = client.put(f"{url}/routines/{added['routines'][0]['id']}", json={"weekdays": [4, 0, 0, 9, "x"]}).json()["macrocycle"]
                self.assertEqual(wd["routines"][0]["weekdays"], [0, 4])
                noted = client.patch(url, json={"description": " Dreimal pro Woche, Technik vor Gewicht. "}).json()["macrocycle"]
                self.assertEqual(noted["description"], "Dreimal pro Woche, Technik vor Gewicht.")
                v2 = client.patch("/api" + url, json={"status": "published", "message": "Wochentage + Hinweis"})
                self.assertEqual(v2.json()["macrocycle"]["headVersion"], 2)
                self.assertEqual(client.patch("/api" + url, json={"status": "published"}).status_code, 422)  # unverändert seit v2
                self.assertEqual(client.patch(url, json={"status": "published"}).status_code, 422)
                self.assertEqual(client.get(url).json()["macrocycle"]["headVersion"], 2)
                versions = client.get(f"{url}/versions").json()["versions"]
                self.assertEqual([v["id"] for v in versions], ["v1", "v2"])
                self.assertEqual(versions[0]["snapshot"]["routines"][0]["weekdays"], [])
                self.assertEqual(versions[1]["message"], "Wochentage + Hinweis")
                self.assertEqual(client.post(f"{url}/restore", json={"version": "v1"}).json()["macrocycle"]["description"], "")
                self.assertEqual(client.get(url).json()["macrocycle"]["published"]["description"], "Dreimal pro Woche, Technik vor Gewicht.")
                self.assertEqual(client.post(f"{url}/restore", json={"version": "v9"}).status_code, 404)
                client.patch(url, json={"description": " Dreimal pro Woche, Technik vor Gewicht. "})
                self.assertEqual(client.patch(url, json={"status": "draft"}).json()["macrocycle"]["status"], "draft")
                self.assertEqual(client.patch(url, json={"status": "archived"}).status_code, 422)
                self.assertEqual(client.patch(url, json={"status": "published"}).json()["macrocycle"]["status"], "published")
                body = {"routine_id": routine_id, "sourcePlanId": plan["id"], "sourcePlanRoutineId": added["routines"][0]["id"], "routine_snapshot": routine}
                result = client.post("/api/workouts?uid=client", json=body)
                self.assertEqual(result.status_code, 200)
                workout_id = result.json()["id"]
                ex_id = routine["exercises"][0]["id"]
                client.patch(f"/routines/{routine_id}/exercises/{ex_id}?uid=client", json={"name": "Changed afterwards"})
                workout = client.get(f"/workouts/{workout_id}?uid=client").json()["workout"]
                self.assertEqual(workout["exercises"][0]["name"], "Bench")
                self.assertEqual(workout["exercises"][0]["notes"], "Coach cue")
                self.assertEqual(workout["exercises"][0]["rest_seconds"], 0)
                self.assertEqual(workout["exercises"][0]["instructions"], ["Control the bar."])
                self.assertFalse(workout["exercises"][0]["sets"][0]["completed"])
                self.assertIsNone(workout["exercises"][0]["sets"][0]["reps"])
                self.assertEqual(client.get(f"/workouts/{workout_id}?uid=coach").status_code, 404)
                self.assertEqual(client.post("/workouts", json={"routine_id": "missing"}).status_code, 404)
                self.assertEqual(client.post("/workouts", json={"routine_snapshot": {"exercises": "bad"}}).status_code, 422)
                for path in Path(root).rglob("*.json"):
                    self.assertTrue(path.is_relative_to(root))

    def test_patch_list_delete_and_input_hardening(self):
        with tempfile.TemporaryDirectory(prefix="plan-router-test-") as root:
            config = types.ModuleType("fitness.api.config")
            config.RUNTIME = Path(root)
            config.SESS_ROOT = Path(root) / "users"
            config._read_json = lambda path: json.loads(path.read_text()) if path.exists() else None

            def write(path, value):
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(json.dumps(value))

            config._write_json = write
            config._uid_from_request = lambda request: "client"
            sys.modules["fitness.api.config"] = config
            sys.modules.pop("fitness.api.routers.macrocycles", None)
            import importlib
            macrocycles = importlib.import_module("fitness.api.routers.macrocycles")
            app = FastAPI()
            app.include_router(macrocycles.router)
            ex = [{"exercise_id": "a", "name": "A"}]
            with RouterClient(app) as client:
                base = "/fitness/coach/macrocycles/client"
                plan = client.post(base, json={"name": "PPL", "coachUid": "coach", "totalWeeks": "abc"}).json()["macrocycle"]
                self.assertEqual(plan["status"], "draft")
                self.assertEqual(plan["totalWeeks"], 10)
                url = f'{base}/{plan["id"]}'
                client.post(f"{url}/routines", json={"label": "Push", "exercises": ex, "restHoursAfter": "x", "weekdays": [2, 2, 8]})
                # name + description + status im selben PATCH, message/author als Nicht-String
                out = client.patch(url, json={"status": "published", "name": " Neu ", "description": "Hinweis", "message": 5, "author": ["x"]}).json()["macrocycle"]
                self.assertEqual(out["published"]["name"], "Neu")
                self.assertEqual(out["published"]["description"], "Hinweis")
                self.assertEqual(out["headMessage"], "Erste Version")
                self.assertEqual(out["routines"][0]["restHoursAfter"], 0)
                self.assertEqual(out["routines"][0]["weekdays"], [2])
                v1 = client.get(f"{url}/versions").json()["versions"][0]
                self.assertEqual(v1["author"], "coach")
                self.assertEqual(client.patch(url, json={"name": "  "}).status_code, 400)
                # Liste: ohne published, Zähler vom veröffentlichten Stand
                client.post(f"{url}/routines", json={"label": "Pull", "exercises": ex})
                entry = client.get(base).json()["macrocycles"][0]
                self.assertNotIn("published", entry)
                self.assertNotIn("routines", entry)
                self.assertEqual((entry["routineCount"], entry["workingRoutineCount"]), (1, 2))
                # createMacrocycle mit routines
                copy = client.post(base, json={"name": "Kopie", "coachUid": "coach", "routines": [{"label": "A", "exercises": ex, "weekdays": [5, 1], "sourceTemplateId": None}, {"label": " "}]}).json()["macrocycle"]
                self.assertEqual([r["weekdays"] for r in copy["routines"]], [[1, 5]])
                self.assertEqual(copy["routines"][0]["exercises"], ex)
                # delete_routine: unbekannt -> 404
                self.assertEqual(client.delete(f"{url}/routines/rt_nope").status_code, 404)
                # delete räumt Unterordner auf
                sub = Path(root) / "users" / "client" / "macrocycles" / plan["id"]
                self.assertTrue((sub / "versions").exists())
                self.assertEqual(client.delete(url).status_code, 200)
                self.assertFalse(sub.exists())
                self.assertFalse((sub.parent / f'{plan["id"]}.json').exists())
                self.assertTrue((sub.parent / f'{copy["id"]}.json').exists())


if __name__ == "__main__":
    unittest.main()
