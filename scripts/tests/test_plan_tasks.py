"""Taskwarrior-Anbindung: Vorkommen → Tasks pro Klient (echte `task`-Binary, temporäre DB)."""
import json
import shutil
import sys
import tempfile
import unittest
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fitness import plan_tasks as pt  # noqa: E402


def local(y, m, d, h=10):
    return datetime(y, m, d, h).astimezone()


def plan(status="published", weekdays=(0,)):
    return {
        "id": "p1", "name": "PPL", "status": status, "headVersion": 2,
        "publishedAt": local(2026, 10, 18, 8).isoformat(),
        "published": {"name": "PPL", "routines": [{"id": "A", "label": "Push", "weekdays": list(weekdays), "exercises": [{}]}]},
    }


def done(day):
    return {"id": f"w{day}", "sourcePlanRoutineId": "A", "finished_at": local(2026, 10, day, 18).isoformat()}


class PlanTasksTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="plan-tasks-"))
        self.u = self.tmp / "users" / "c1"
        (self.u / "macrocycles").mkdir(parents=True)
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def put(self, m, workouts=()):
        (self.u / "macrocycles" / "p1.json").write_text(json.dumps(m))
        (self.u / "workouts.json").write_text(json.dumps(list(workouts)))

    def test_occurrence_statuses_match_the_window(self):
        rs = plan()["published"]["routines"]
        st = lambda d, ws=(): [o["status"] for o in pt.occurrences(rs, list(ws), date(2026, 10, d), date(2026, 10, 18))]
        self.assertEqual(st(18), ["scheduled"])  # Sonntag → Mo ab jetzt möglich
        self.assertEqual(st(19), ["due"])
        self.assertEqual(st(21), ["overdue"])  # Offenes bleibt offen
        self.assertEqual(st(18, [done(18)]), ["done"])
        self.assertEqual(st(24, [done(22)]), ["done"])  # Zusatztraining holt nach

    def test_sync_creates_idempotent_tasks_and_completes(self):
        self.put(plan())
        now = local(2026, 10, 19)
        self.assertEqual(pt.sync("c1", self.tmp, now)["created"], 1)
        again = pt.sync("c1", self.tmp, now)
        self.assertEqual((again["created"], again["completed"], again["deleted"]), (0, 0, 0))
        tasks = pt.pending("c1", self.tmp)
        self.assertEqual(len(tasks), 1)
        self.assertIn("Push · PPL (v2)", tasks[0]["description"])
        self.assertTrue(tasks[0]["due"].startswith("2026-10-19"))
        self.assertTrue(tasks[0]["scheduled"].startswith("2026-10-18"))
        self.put(plan(), [done(19)])
        self.assertEqual(pt.sync("c1", self.tmp, now)["completed"], 1)
        self.assertEqual(pt.pending("c1", self.tmp), [])

    def test_unpublished_plan_removes_pending_tasks_and_clients_are_isolated(self):
        self.put(plan())
        now = local(2026, 10, 19)
        pt.sync("c1", self.tmp, now)
        self.put(plan(status="draft"))
        self.assertEqual(pt.sync("c1", self.tmp, now)["deleted"], 1)
        self.assertEqual(pt.pending("c1", self.tmp), [])
        self.assertEqual(pt.pending("c2", self.tmp), [])
        self.assertTrue((self.tmp / "users" / "c1" / "taskwarrior" / "data").exists())


if __name__ == "__main__":
    unittest.main()
