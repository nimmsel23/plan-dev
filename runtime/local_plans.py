"""Plan-owned local drafts and immutable versions. No Firebase or framework imports."""
from __future__ import annotations
import json
import os
import re
import tempfile
import threading
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

_LOCK = threading.RLock()
IDENTIFIER = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,127}\Z")

class PlanError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status

def now():
    return datetime.now(timezone.utc).isoformat()

def read(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return None

def atomic(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix='.plan-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)

def snapshot(plan):
    return {key: plan[key] for key in ('name', 'description', 'totalWeeks', 'routines')}

def validate(body, complete=False):
    if not isinstance(body, dict): raise PlanError('Plan muss ein Objekt sein.')
    name = str(body.get('name') or '').strip()
    routines = body.get('routines', [])
    weeks = body.get('totalWeeks', 10)
    if not name or len(name) > 80: raise PlanError('Planname fehlt oder ist zu lang.')
    if type(weeks) is not int or not 1 <= weeks <= 104: raise PlanError('Dauer muss 1–104 Wochen sein.')
    if not isinstance(routines, list) or len(routines) > 50: raise PlanError('Ungültige Trainingstage.')
    ids = set()
    for day in routines:
        if not isinstance(day, dict) or not isinstance(day.get('id'), str) or day['id'] in ids or not isinstance(day.get('label'), str) or not day['label'].strip(): raise PlanError('Trainingstage brauchen eindeutige IDs und Namen.')
        ids.add(day['id'])
        if not isinstance(day.get('exercises'), list) or len(day['exercises']) > 100: raise PlanError('Ungültige Übungen.')
        exids = set()
        for ex in day['exercises']:
            if not isinstance(ex, dict) or not isinstance(ex.get('id'), str) or ex['id'] in exids or not ex.get('name'): raise PlanError('Übungen brauchen eindeutige IDs und Namen.')
            exids.add(ex['id'])
        if complete and not day['exercises']: raise PlanError('Jeder Trainingstag braucht Übungen.')
    if complete and not routines: raise PlanError('Mindestens ein Trainingstag erforderlich.')
    return {'name': name, 'description': str(body.get('description') or '')[:2000], 'totalWeeks': weeks, 'routines': routines}

class LocalPlans:
    def __init__(self, root):
        self.root = Path(root).expanduser().resolve()

    def client(self, client):
        if not IDENTIFIER.fullmatch(client): raise PlanError('Ungültiger Klient.', 400)
        folder = (self.root / client).resolve()
        if not folder.is_relative_to(self.root) or not (folder / 'client.json').is_file(): raise PlanError('Klient nicht gefunden.', 404)
        return folder

    def clients(self):
        result = []
        if not self.root.is_dir(): return result
        for folder in self.root.iterdir():
            if not IDENTIFIER.fullmatch(folder.name): continue
            try:
                profile = read(self.client(folder.name) / 'client.json') or {}
                result.append({'id': folder.name, 'name': profile.get('name') or profile.get('displayName') or folder.name, 'status': profile.get('status') or '', 'canDeliver': bool(profile.get('firebase_uid')), 'hasLegacyPlan': (folder / 'data/plan.json').is_file()})
            except (PlanError, ValueError): continue
        return sorted(result, key=lambda item: item['name'].casefold())

    def directory(self, client):
        folder = (self.client(client) / 'data' / 'training-plans').resolve()
        if not folder.is_relative_to(self.root): raise PlanError('Planablage liegt außerhalb des Klientenverzeichnisses.', 403)
        return folder

    def path(self, client, plan):
        if not IDENTIFIER.fullmatch(plan): raise PlanError('Ungültiger Plan.', 400)
        return self.directory(client) / f'{plan}.json'

    def get(self, client, plan):
        value = read(self.path(client, plan))
        if value is None: raise PlanError('Plan nicht gefunden.', 404)
        return value

    def list(self, client):
        return sorted([read(p) for p in self.directory(client).glob('*.json')], key=lambda p: p['updatedAt'], reverse=True)

    def create(self, client, body):
        with _LOCK:
            record = {**validate(body), 'id': str(uuid4()), 'createdAt': now(), 'updatedAt': now(), 'headVersion': 0, 'status': 'draft'}
            atomic(self.path(client, record['id']), record)
            return record

    def save(self, client, plan, body):
        with _LOCK:
            current = self.get(client, plan)
            if body.get('expectedUpdatedAt') != current['updatedAt']: raise PlanError('Plan wurde inzwischen geändert. Bitte neu öffnen; dein lokaler Entwurf bleibt erhalten.', 409)
            result = {**current, **validate(body), 'updatedAt': now()}
            atomic(self.path(client, plan), result)
            return result

    def versions(self, client, plan):
        self.get(client, plan)
        folder = self.directory(client) / plan / 'versions'
        return sorted([read(p) for p in folder.glob('*.json')], key=lambda v: v['number'], reverse=True)

    def release(self, client, plan, body):
        with _LOCK:
            current = self.get(client, plan)
            if body.get('expectedUpdatedAt') != current['updatedAt']: raise PlanError('Plan wurde inzwischen geändert.', 409)
            snap = validate(current, complete=True)
            if current.get('published') == snap: raise PlanError('Keine Änderungen seit der letzten Version.')
            # Recover monotonically even if a previous process stopped between version and head writes.
            versions = self.versions(client, plan)
            number = max(current.get('headVersion', 0), versions[0]['number'] if versions else 0) + 1
            record = {'number': number, 'createdAt': now(), 'message': str(body.get('message') or 'Freigegeben')[:200], 'snapshot': snap}
            atomic(self.directory(client) / plan / 'versions' / f'v{number}.json', record)
            current.update(headVersion=number, published=snap, publishedAt=record['createdAt'], updatedAt=now(), status='ready')
            atomic(self.path(client, plan), current)
            return current

    def legacy(self, client):
        return read(self.client(client) / 'data/plan.json') or {'einheiten': []}

    def delivery_payload(self, client, plan):
        current = self.get(client, plan)
        if not current.get('published'): raise PlanError('Zuerst eine lokale Version freigeben.')
        profile = read(self.client(client) / 'client.json') or {}
        uid = profile.get('firebase_uid')
        if not isinstance(uid, str) or not IDENTIFIER.fullmatch(uid): raise PlanError('Dem Klienten fehlt eine gültige Firebase-UID.')
        return {'clientUid': uid, 'planId': f'local-{plan}', 'source': 'coach-local-plan', 'localVersion': current['headVersion'], 'snapshot': current['published']}

    def delivered(self, client, plan, version, result):
        with _LOCK:
            current = self.get(client, plan)
            current['delivery'] = {'localVersion': version, 'at': now(), 'remotePlanId': result['planId'], 'remoteVersion': result['version']}
            # Delivery metadata must not invalidate an editor's unchanged content revision.
            atomic(self.path(client, plan), current)
            return current

def markdown(plan):
    lines = [f"# {plan['name']}", '', plan.get('description', ''), '', f"Dauer: {plan['totalWeeks']} Wochen", '']
    for day in plan['routines']:
        lines += [f"## {day['label']}", '']
        for ex in day['exercises']:
            lines += [f"### {ex['name']}"]
            for i, s in enumerate(ex.get('templateSets') or [], 1):
                target = f"{s['targetDuration']} s" if s.get('targetDuration') else f"{s.get('targetReps', '–')} Wdh."
                weight = f" · {s['targetWeight']} kg" if s.get('targetWeight') is not None else ''
                lines.append(f"- Satz {i}: {target}{weight}")
            lines += [f"Pause: {ex.get('rest_seconds', 90)} s", ex.get('notes', ''), '']
    return '\n'.join(lines)
