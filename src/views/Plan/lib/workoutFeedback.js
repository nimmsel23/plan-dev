// Rückmeldung des Klienten nach dem Training: Anstrengung (1–10, RPE) und freie Notiz.
export const EFFORT_LABELS = { 1: 'sehr leicht', 3: 'leicht', 5: 'mittel', 7: 'fordernd', 9: 'sehr hart', 10: 'am Limit' };

export function effortLabel(effort) {
  const keys = Object.keys(EFFORT_LABELS).map(Number).sort((a, b) => a - b);
  const key = [...keys].reverse().find((k) => k <= effort);
  return key ? EFFORT_LABELS[key] : '';
}

// Liefert null, wenn weder Anstrengung noch Notiz angegeben sind.
export function normFeedback({ effort, note } = {}, now = new Date()) {
  const e = Math.round(Number(effort));
  const hasEffort = Number.isFinite(e) && e >= 1 && e <= 10;
  const text = typeof note === 'string' ? note.trim().slice(0, 1000) : '';
  if (!hasEffort && !text) return null;
  return { ...(hasEffort ? { effort: e } : {}), ...(text ? { note: text } : {}), at: now.toISOString() };
}
