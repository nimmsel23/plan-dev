"""Temporary backend for browser smoke tests. No real runtime configuration."""
import json
from pathlib import Path
import sys
import tempfile
import types

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from fastapi import FastAPI
import uvicorn

with tempfile.TemporaryDirectory(prefix="plan-browser-runtime-") as root:
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
    config._uid_from_request = lambda request: request.query_params.get("uid") or request.cookies.get("test-persona", "client")
    sys.modules["fitness.api.config"] = config
    from fitness.api.routers import workouts, macrocycles
    app = FastAPI()
    app.include_router(workouts.router)
    app.include_router(macrocycles.router)
    app.include_router(workouts.router, prefix="/api")
    app.include_router(macrocycles.router, prefix="/api")
    @app.get("/fitness/coach/profiles")
    async def profiles():
        return {"profiles": {"client": {"displayName": "Test Client", "email": "client@isolated.test"}, "coach": {"displayName": "Test Coach"}}}
    @app.get("/fitness/plans/assigned")
    async def assigned():
        return {"plans": []}
    @app.get("/fitness/exercises/search")
    async def search():
        return {"results": []}
    uvicorn.run(app, host="127.0.0.1", port=15915)
