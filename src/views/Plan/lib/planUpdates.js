// „Was ist neu?“: Der Klient hat je Coach-Plan eine zuletzt gesehene Version (nur lokal im Gerät).
// Ohne Eintrag wird die aktuelle Version still als Ausgangsstand gemerkt (neue Pläne meldet „Neu vom Coach“).
const key = (uid) => `plan-seen-versions:${uid}`;

export function readSeenVersions(uid) {
  try { const v = JSON.parse(localStorage.getItem(key(uid)) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}

export function markVersionsSeen(uid, plans) {
  try {
    const seen = readSeenVersions(uid);
    plans.forEach((p) => { if (p.headVersion) seen[p.id] = p.headVersion; });
    localStorage.setItem(key(uid), JSON.stringify(seen));
  } catch { /* Speicher gesperrt: Hinweis erscheint dann erneut */ }
}

// plans: Klientensicht (clientView) mit headVersion. Liefert Pläne mit neuerer Version als zuletzt gesehen
// und die Pläne ohne Ausgangsstand (baseline).
export function pendingUpdates(plans = [], seen = {}) {
  const updates = [];
  const baseline = [];
  plans.forEach((p) => {
    if (!p.headVersion) return;
    if (seen[p.id] == null) baseline.push(p);
    else if (p.headVersion > seen[p.id]) updates.push({ plan: p, from: seen[p.id] });
  });
  return { updates, baseline };
}

// Diff-Zeilen zwischen gesehener und aktueller Version aus der Versionsliste (Snapshots); [] wenn nicht ermittelbar.
export function updateLines(versions = [], from, to, diff) {
  const a = versions.find((v) => v.number === from)?.snapshot;
  const b = versions.find((v) => v.number === to)?.snapshot;
  if (!a || !b) return [];
  return diff(a, b).map((l) => l.text).filter(Boolean);
}
