// Welcher Makrozyklus ist für den Klienten "der aktuelle"? Bevorzugt veröffentlichte Pläne, davon den zuletzt
// veröffentlichten bzw. zugestellten; ohne veröffentlichte der zuletzt angelegte (Reihenfolge der Liste: neueste zuerst).
const stamp = (c) => Date.parse(c?.publishedAt || c?.updatedAt || c?.createdAt || '') || 0;

export function pickActiveMacrocycle(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const published = list.filter((c) => c?.status === 'published' || c?.publishedAt);
  if (!published.length) return list[0];
  return published.reduce((best, c) => (stamp(c) > stamp(best) ? c : best));
}
