// "Neu vom Coach": bereitgestellte Coach-Pläne, die der Klient noch nicht gesehen hat.
// Gemerkt wird je Plan der publishedAt-Stand, ein erneutes Bereitstellen meldet sich also wieder.
const key = (uid) => `plan-seen-plans:${uid}`;

export function readSeen(uid) {
  try { const v = JSON.parse(localStorage.getItem(key(uid)) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}

export function markSeen(uid, plans) {
  try {
    const seen = readSeen(uid);
    plans.forEach((p) => { if (p.publishedAt) seen[p.id] = p.publishedAt; });
    localStorage.setItem(key(uid), JSON.stringify(seen));
  } catch { /* Speicher gesperrt: Hinweis erscheint dann erneut */ }
}

export function unseenCoachPlans(plans = [], uid, seen = {}) {
  return plans.filter((p) => p.status !== 'draft' && p.coachUid && p.coachUid !== uid
    && p.publishedAt && seen[p.id] !== p.publishedAt);
}
