"""Makrozyklen: Coach baut Klienten einen rotierenden Trainingszyklus
(z.B. Push/Pull/Legs) mit sichtbarer Progression — kein Kalender/Wochentage.

Struktur:
  Makrozyklus → Routinen (z.B. Push, Pull, Legs), fest geordnet, rotieren
  endlos. Jede Routine hat eine Ziel-Übungsliste (sets/reps/weight, vom Coach
  von Hand gepflegt). Der Klient arbeitet sie der Reihe nach ab; jede
  abgeschlossene Einheit wird als Completion samt tatsächlicher Leistung
  gespeichert — daraus ergibt sich "letztes Mal"-Referenz für Progression,
  ohne dass irgendwas automatisch hochgerechnet wird.

Speicherort: ~/.aos/fitness/users/<client_uid>/macrocycles/<id>.json
Completions: .../macrocycles/<id>/completions/<timestamp>.json
"""
from __future__ import annotations

import shutil
import threading
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request
from loguru import logger

from fitness.api.config import RUNTIME, _read_json, _write_json

router = APIRouter(prefix="/fitness/coach/macrocycles")

# Alle Lesen-Ändern-Schreiben-Pfade laufen unter diesem Lock (Threadpool-Handler überlappen sonst).
_lock = threading.RLock()


def _int(value: Any, default: int = 0) -> int:
    """Robuste Ganzzahl: Strings/None/Müll ergeben `default` statt eines 500."""
    if isinstance(value, bool):
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError, OverflowError):
        return default


def _weeks(value: Any) -> int:
    n = _int(value, 10)
    return n if 0 < n <= 520 else 10


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _new_routine(body: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"rt_{uuid4().hex[:8]}",
        "label": body["label"],
        "isDeload": bool(body.get("isDeload", False)),
        # Pflicht-Pause NACH dieser Routine, bevor die nächste fällig wird —
        # pro Routine frei wählbar (Push→24h, Pull→48h, Legs→72h o.ä.), kein
        # globales Fenster für den ganzen Zyklus.
        "restHoursAfter": max(_int(body.get("restHoursAfter")), 0),
        # Plan-Ziel pro Routine: x-mal in y Tagen (rollierendes Fenster),
        # unabhängig von der Rotation-Reihenfolge — beides kann parallel
        # existieren (Rotation sagt "was ist dran", Ziel sagt "reicht das").
        "targetCount": max(_int(body.get("targetCount")), 0),
        "targetPeriodDays": max(_int(body.get("targetPeriodDays")), 0),
        "weekdays": _weekdays(body.get("weekdays")),
        # Verweis auf das Template (routines.json-Eintrag), aus dem diese
        # Plan-Routine erzeugt wurde — Fortschritt wird darüber gegen die
        # echten Workout-Completions gezählt (workouts.routine_id), nicht
        # gegen einen separaten /complete-Aufruf. Optional: von Hand
        # angelegte Plan-Routinen ohne Template-Bezug bleiben None.
        "sourceTemplateId": body.get("sourceTemplateId"),
        "exercises": body.get("exercises") if isinstance(body.get("exercises"), list) else [],
    }


def _dir(client_uid: str) -> Path:
    return RUNTIME / "users" / client_uid / "macrocycles"


def _path(client_uid: str, cycle_id: str) -> Path:
    return _dir(client_uid) / f"{cycle_id}.json"


def _completions_dir(client_uid: str, cycle_id: str) -> Path:
    return _dir(client_uid) / cycle_id / "completions"


def _load(client_uid: str, cycle_id: str) -> dict[str, Any]:
    m = _read_json(_path(client_uid, cycle_id))
    if not m:
        raise HTTPException(404, detail="Zyklus nicht gefunden")
    return m


def _save(client_uid: str, macrocycle: dict[str, Any]) -> dict[str, Any]:
    macrocycle["updatedAt"] = datetime.now().isoformat()
    _write_json(_path(client_uid, macrocycle["id"]), macrocycle)
    return macrocycle


def _versions_dir(client_uid: str, cycle_id: str) -> Path:
    return _dir(client_uid) / cycle_id / "versions"


def _snapshot(m: dict[str, Any]) -> dict[str, Any]:
    """Inhalt, der veröffentlicht wird (Git: Tree eines Commits)."""
    routines = [{**r, "weekdays": sorted(r.get("weekdays") or []), "exercises": r.get("exercises") or []} for r in m.get("routines") or []]
    return {
        "name": m.get("name", ""),
        "description": m.get("description") or "",
        "totalWeeks": _weeks(m.get("totalWeeks")),
        "routines": routines,
    }


def _versions(client_uid: str, cycle_id: str) -> list[dict[str, Any]]:
    dir_ = _versions_dir(client_uid, cycle_id)
    items = [v for f in dir_.glob("*.json") if (v := _read_json(f))] if dir_.exists() else []
    items.sort(key=lambda v: v.get("number", 0))
    return items


def _weekdays(value: Any) -> list[int]:
    """Wochentage 0=Mo … 6=So; ungültige Werte werden verworfen."""
    if not isinstance(value, list):
        return []
    return sorted({int(d) for d in value if isinstance(d, (int, float)) and not isinstance(d, bool) and 0 <= int(d) <= 6})


def _completions(client_uid: str, cycle_id: str) -> list[dict[str, Any]]:
    dir_ = _completions_dir(client_uid, cycle_id)
    if not dir_.exists():
        return []
    items = [c for f in sorted(dir_.glob("*.json")) if (c := _read_json(f))]
    items.sort(key=lambda c: c.get("completedAt", ""))
    return items


@router.get("/{client_uid}")
def list_macrocycles(client_uid: str):
    dir_ = _dir(client_uid)
    if not dir_.exists():
        return {"ok": True, "macrocycles": []}
    items = []
    for f in sorted(dir_.glob("*.json")):
        m = _read_json(f)
        if m:
            working = len(m.get("routines") or [])
            published = m.get("published")
            count = len(published.get("routines") or []) if isinstance(published, dict) else working
            items.append({k: v for k, v in m.items() if k not in ("routines", "published")} | {"routineCount": count, "workingRoutineCount": working})
    items.sort(key=lambda m: m.get("createdAt", ""), reverse=True)
    return {"ok": True, "macrocycles": items}


@router.get("/{client_uid}/{cycle_id}")
def get_macrocycle(client_uid: str, cycle_id: str):
    m = _load(client_uid, cycle_id)
    completions = _completions(client_uid, cycle_id)
    next_index = len(completions) % len(m["routines"]) if m["routines"] else 0

    # Nur eine Anzeige-Info, keine Sperre — der Coach/Klient entscheidet
    # trotzdem selbst, die App schlägt nur "noch nicht dran" vor.
    resting_until = None
    if completions:
        last = completions[-1]
        last_routine = next((r for r in m["routines"] if r["id"] == last["routineId"]), None)
        rest_hours = (last_routine or {}).get("restHoursAfter") or 0
        if rest_hours:
            completed_at = datetime.fromisoformat(last["completedAt"])
            ready_at = completed_at.timestamp() + rest_hours * 3600
            if ready_at > datetime.now().timestamp():
                resting_until = datetime.fromtimestamp(ready_at).isoformat()

    total_weeks = _weeks(m.get("totalWeeks"))
    elapsed_weeks = int((datetime.now() - datetime.fromisoformat(m["createdAt"])).days // 7)
    current_week = min(elapsed_weeks + 1, total_weeks)

    return {
        "ok": True,
        "macrocycle": m,
        "completions": completions,
        "nextRoutineIndex": next_index,
        "restingUntil": resting_until,
        "currentWeek": current_week,
        "totalWeeks": total_weeks,
        "finished": elapsed_weeks >= total_weeks,
    }


@router.post("/{client_uid}")
async def create_macrocycle(client_uid: str, request: Request):
    body: dict[str, Any] = await request.json()
    name = _text(body.get("name"))
    coach_uid = body.get("coachUid")
    if not name or not coach_uid:
        raise HTTPException(400, detail="name und coachUid erforderlich")

    raw_routines = body.get("routines")
    routines = [_new_routine(r) for r in raw_routines if isinstance(r, dict) and _text(r.get("label"))] if isinstance(raw_routines, list) else []
    status = body.get("status")

    cycle_id = f"mc_{uuid4().hex[:12]}"
    record = {
        "id": cycle_id,
        "name": name,
        "clientUid": client_uid,
        "coachUid": coach_uid,
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat(),
        # Ein Makrozyklus hat einen Rahmen (z.B. 10 Wochen) — die Rotation
        # (Push/Pull/Legs/...) läuft flexibel innerhalb davon, ohne an
        # Wochentage gebunden zu sein, aber der Zyklus selbst hat Anfang+Ende.
        "totalWeeks": _weeks(body.get("totalWeeks")),
        "routines": routines,
        "status": status if status in ("draft", "published") else "draft",
        "description": _text(body.get("description"))[:2000],
    }
    with _lock:
        _write_json(_path(client_uid, cycle_id), record)
    logger.info(f"macrocycles: {coach_uid} → {client_uid} '{name}' angelegt")
    return {"ok": True, "macrocycle": record}


@router.delete("/{client_uid}/{cycle_id}")
def delete_macrocycle(client_uid: str, cycle_id: str):
    if cycle_id in ("", ".", "..") or "/" in cycle_id or "\\" in cycle_id:
        raise HTTPException(400, detail="Ungültige Zyklus-ID")
    with _lock:
        path = _path(client_uid, cycle_id)
        if path.exists():
            path.unlink()
        root = _dir(client_uid).resolve()
        sub = (root / cycle_id).resolve()
        if sub.is_dir() and sub.parent == root:
            shutil.rmtree(sub, ignore_errors=True)
    return {"ok": True}


# ── Routinen (Push/Pull/Legs/...) ───────────────────────────────────────────

@router.post("/{client_uid}/{cycle_id}/routines")
async def add_routine(client_uid: str, cycle_id: str, request: Request):
    body: dict[str, Any] = await request.json()
    label = _text(body.get("label"))
    if not label:
        raise HTTPException(400, detail="label erforderlich")

    with _lock:
        m = _load(client_uid, cycle_id)
        m["routines"].append(_new_routine({**body, "label": label}))
        _save(client_uid, m)
    return {"ok": True, "macrocycle": m}


@router.put("/{client_uid}/{cycle_id}/routines/{routine_id}")
async def update_routine(client_uid: str, cycle_id: str, routine_id: str, request: Request):
    body: dict[str, Any] = await request.json()
    with _lock:
        m = _load(client_uid, cycle_id)
        routine = next((r for r in m["routines"] if r["id"] == routine_id), None)
        if not routine:
            raise HTTPException(404, detail="Routine nicht gefunden")
        if "label" in body:
            routine["label"] = body["label"]
        if "isDeload" in body:
            routine["isDeload"] = bool(body["isDeload"])
        if "restHoursAfter" in body:
            routine["restHoursAfter"] = max(_int(body["restHoursAfter"]), 0)
        if "targetCount" in body:
            routine["targetCount"] = max(_int(body["targetCount"]), 0)
        if "targetPeriodDays" in body:
            routine["targetPeriodDays"] = max(_int(body["targetPeriodDays"]), 0)
        if "weekdays" in body:
            routine["weekdays"] = _weekdays(body["weekdays"])
        if "exercises" in body and isinstance(body["exercises"], list):
            routine["exercises"] = body["exercises"]
        _save(client_uid, m)
    return {"ok": True, "macrocycle": m}


@router.delete("/{client_uid}/{cycle_id}/routines/{routine_id}")
def delete_routine(client_uid: str, cycle_id: str, routine_id: str):
    with _lock:
        m = _load(client_uid, cycle_id)
        if not any(r["id"] == routine_id for r in m["routines"]):
            raise HTTPException(404, detail="Routine nicht gefunden")
        m["routines"] = [r for r in m["routines"] if r["id"] != routine_id]
        _save(client_uid, m)
    return {"ok": True, "macrocycle": m}


# ── Completions (Klient hakt ab, mit tatsächlicher Leistung) ───────────────

@router.post("/{client_uid}/{cycle_id}/complete")
async def complete_routine(client_uid: str, cycle_id: str, request: Request):
    body: dict[str, Any] = await request.json()
    routine_id = body.get("routineId")
    performed = body.get("exercises") or []  # [{exercise_id, sets, reps, weight}]
    if not routine_id:
        raise HTTPException(400, detail="routineId erforderlich")

    m = _load(client_uid, cycle_id)
    if not any(r["id"] == routine_id for r in m["routines"]):
        raise HTTPException(404, detail="Routine nicht gefunden")

    record = {
        "id": f"cmp_{uuid4().hex[:10]}",
        "routineId": routine_id,
        "completedAt": datetime.now().isoformat(),
        "exercises": performed,
    }
    dir_ = _completions_dir(client_uid, cycle_id)
    dir_.mkdir(parents=True, exist_ok=True)
    _write_json(dir_ / f"{record['id']}.json", record)
    logger.info(f"macrocycles: {client_uid} completed {routine_id} in {cycle_id}")
    return {"ok": True, "completion": record}


@router.get("/{client_uid}/{cycle_id}/routines/{routine_id}/last")
def last_performance(client_uid: str, cycle_id: str, routine_id: str):
    """Letzte Completion dieser Routine — Referenz für Progression im Client-UI."""
    completions = [c for c in _completions(client_uid, cycle_id) if c.get("routineId") == routine_id]
    return {"ok": True, "last": completions[-1] if completions else None}


@router.patch("/{client_uid}/{cycle_id}")
async def update_macrocycle(client_uid: str, cycle_id: str, request: Request):
    """Status (draft/published), Name und Coach-Hinweis ändern. Veröffentlichen legt eine Version an (message/author optional)."""
    body = await request.json()
    status = body.get("status")
    if status not in (None, "draft", "published"):
        raise HTTPException(422, detail="unsupported_status")
    name = None
    if "name" in body:
        name = _text(body.get("name"))
        if not name:
            raise HTTPException(400, detail="name erforderlich")
    with _lock:
        m = _load(client_uid, cycle_id)
        # Name/Hinweis zuerst anwenden, damit der Snapshot sie schon enthält.
        if name is not None:
            m["name"] = name
        if "description" in body:
            m["description"] = _text(body.get("description"))[:2000]
        if status == "published":
            if not m.get("routines") or any(not r.get("exercises") for r in m["routines"]):
                raise HTTPException(422, detail="Jede Einheit braucht Übungen.")
            snap = _snapshot(m)
            head = m.get("published")
            if m.get("status") == "published" and head is not None and head == snap:
                raise HTTPException(422, detail="Keine Änderungen seit der letzten Version.")
            now = datetime.now().isoformat()
            if head is None or head != snap:
                number = _int(m.get("headVersion")) + 1
                vpath = _versions_dir(client_uid, cycle_id) / f"v{number}.json"
                if vpath.exists():
                    raise HTTPException(409, detail=f"Version v{number} existiert bereits")
                message = _text(body.get("message"))[:200] or ("Erste Version" if number == 1 else "Aktualisiert")
                author = _text(body.get("author")) or m.get("coachUid")
                record = {
                    "id": f"v{number}", "number": number, "message": message,
                    "createdAt": now, "author": author,
                    "parent": f"v{number - 1}" if number > 1 else None,
                    "snapshot": snap,
                }
                _write_json(vpath, record)
                m["published"] = snap
                m["headVersion"] = number
                m["headMessage"] = message
            m["status"] = "published"
            m["publishedAt"] = now
        elif status == "draft":
            m["status"] = "draft"
        _save(client_uid, m)
    return {"ok": True, "macrocycle": m}


@router.get("/{client_uid}/{cycle_id}/versions")
def list_versions(client_uid: str, cycle_id: str):
    """Veröffentlichungs-Verlauf (neueste zuletzt), je mit unveränderlichem Snapshot."""
    _load(client_uid, cycle_id)
    return {"ok": True, "versions": _versions(client_uid, cycle_id)}


@router.post("/taskwarrior/{client_uid}/sync")
def taskwarrior_sync(client_uid: str):
    """Plan-Einheiten des Klienten in seine eigene Taskwarrior-DB abgleichen (einseitig, idempotent)."""
    try:
        from fitness import plan_tasks
    except ImportError as err:  # tasklib fehlt
        raise HTTPException(501, detail=f"Taskwarrior-Anbindung nicht verfügbar: {err}")
    with _lock:
        return {"ok": True, "report": plan_tasks.sync(client_uid, RUNTIME)}


@router.get("/taskwarrior/{client_uid}/pending")
def taskwarrior_pending(client_uid: str):
    """Offene Tasks in der Taskwarrior-DB des Klienten."""
    try:
        from fitness import plan_tasks
    except ImportError as err:
        raise HTTPException(501, detail=f"Taskwarrior-Anbindung nicht verfügbar: {err}")
    return {"ok": True, "tasks": plan_tasks.pending(client_uid, RUNTIME)}


@router.get("/{client_uid}/{cycle_id}/receipts")
def list_receipts(client_uid: str, cycle_id: str):
    """Lesebestätigungen des Klienten (je Version einmalig)."""
    _load(client_uid, cycle_id)
    dir_ = _versions_dir(client_uid, cycle_id).parent / "receipts"
    items = [r for f in dir_.glob("*.json") if (r := _read_json(f))] if dir_.exists() else []
    items.sort(key=lambda r: r.get("version", 0))
    return {"ok": True, "receipts": items}


@router.post("/{client_uid}/{cycle_id}/receipts")
async def mark_read(client_uid: str, cycle_id: str, request: Request):
    """Klient bestätigt, Version N gesehen zu haben. Unveränderlich; bestehende bleibt erhalten."""
    body: dict[str, Any] = await request.json()
    n = body.get("version")
    if isinstance(n, bool) or not isinstance(n, int) or n < 1:
        raise HTTPException(400, detail="Ungültige Version")
    with _lock:
        _load(client_uid, cycle_id)
        if not any(v.get("number") == n for v in _versions(client_uid, cycle_id)):
            raise HTTPException(404, detail="Version nicht gefunden")
        path = _versions_dir(client_uid, cycle_id).parent / "receipts" / f"v{n}.json"
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            _write_json(path, {"planId": cycle_id, "version": n, "readAt": datetime.now().isoformat()})
    return {"ok": True}


@router.post("/{client_uid}/{cycle_id}/restore")
async def restore_version(client_uid: str, cycle_id: str, request: Request):
    """Arbeitsstand auf eine frühere Version zurücksetzen (Git: checkout). Der Klient
    sieht davon nichts, bis wieder veröffentlicht wird; die Historie bleibt unverändert."""
    body = await request.json()
    version = next((v for v in _versions(client_uid, cycle_id) if v["id"] == body.get("version")), None)
    if not version:
        raise HTTPException(404, detail="Version nicht gefunden")
    with _lock:
        m = _load(client_uid, cycle_id)
        m.update({k: v for k, v in version["snapshot"].items()})
        _save(client_uid, m)
    return {"ok": True, "macrocycle": m}
