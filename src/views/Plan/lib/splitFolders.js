// Automatische Ordner für Templates: ohne gesetztes `category`-Feld wird der
// Split (Push/Pull/Legs/Upper/Lower/Full) aus dem Template-Namen erkannt,
// damit sich die Ordner von selbst bilden, statt dass alles in "Ohne Ordner"
// landet. Eine explizit gesetzte Kategorie hat immer Vorrang. Reine
// Anzeige-Gruppierung — es wird nichts zurückgeschrieben.
//
// Gleiches Keyword-Vokabular wie fitness-devs Long-Press-Sheet
// (views/Session/SplitPlanSheet.jsx), damit ein Template dort unter
// demselben Split auftaucht, unter dem es hier einsortiert ist.

export const SPLIT_ORDER = ["Push", "Pull", "Legs", "Upper", "Lower", "Full"];

// Prüfreihenfolge != Anzeigereihenfolge: Ganzkörper/Ober-/Unterkörper sind
// spezifischere Tagestypen als einzelne Muskelbegriffe, und Legs vor Pull,
// damit z.B. "Back Squat" nicht wegen "back" bei Pull landet.
const DETECT = [
  ["Full", ["full", "ganzkörper", "ganzkoerper", "total body"]],
  ["Upper", ["upper", "oberkörper", "oberkoerper"]],
  ["Lower", ["lower", "unterkörper", "unterkoerper"]],
  ["Push", ["push", "drück", "druck", "brust", "chest"]],
  ["Legs", ["leg", "bein", "squat"]],
  ["Pull", ["pull", "zug", "rücken", "ruecken", "back"]],
];

export function detectSplit(text) {
  const hay = String(text || "").toLowerCase();
  if (!hay.trim()) return null;
  for (const [split, keywords] of DETECT) {
    if (keywords.some((k) => hay.includes(k))) return split;
  }
  return null;
}

// "push" / "PUSH" als Kategorie → kanonisches "Push", damit manuell und
// automatisch einsortierte Templates im selben Ordner landen.
function canonicalFolder(category) {
  const c = String(category).trim();
  return SPLIT_ORDER.find((s) => s.toLowerCase() === c.toLowerCase()) || c;
}

export function groupRoutinesIntoFolders(routines) {
  const folders = {};
  const uncategorized = [];
  for (const r of routines) {
    const folder = r.category ? canonicalFolder(r.category) : detectSplit(r.name);
    if (folder) (folders[folder] ||= []).push(r);
    else uncategorized.push(r);
  }
  const rank = (name) => {
    const i = SPLIT_ORDER.indexOf(name);
    return i === -1 ? SPLIT_ORDER.length : i;
  };
  const folderNames = Object.keys(folders).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "de"));
  return { folders, folderNames, uncategorized };
}
