import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { getUid, listPlanVersions } from '@db';
import { diffSnapshots } from '../lib/planVersions.js';
import { updateLines } from '../lib/planUpdates.js';

// „Was ist neu?“: Coach hat den Plan aktualisiert — Nachricht und Änderungen seit der zuletzt gesehenen Version.
export default function WhatsNew({ update, onDismiss, onOpenPlans }) {
  const { plan, from } = update;
  const [lines, setLines] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    // Ohne Verlauf (Fehler/offline) bleibt es bei der Nachricht des Coaches.
    listPlanVersions(getUid(), plan.id).then((v) => { if (alive) setLines(updateLines(v, from, plan.headVersion, diffSnapshots)); }).catch(() => {});
    return () => { alive = false; };
  }, [plan.id, plan.headVersion, from]);
  const shown = open ? lines : lines.slice(0, 3);
  return <section role="status" className="mb-4 rounded-2xl border border-fit-accent bg-fit-accent/10 p-4">
    <p className="flex items-center gap-2 text-xs font-semibold text-fit-accent"><Sparkles size={14} /> Was ist neu? · {plan.name} · Version {plan.headVersion}</p>
    {plan.headMessage && <p className="mt-2 text-sm font-medium">{plan.headMessage}</p>}
    {lines.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-fit-muted">{shown.map((t, i) => <li key={i}>• {t}</li>)}</ul>}
    {lines.length > 3 && <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-1 min-h-[44px] text-xs text-fit-accent underline">{open ? 'Weniger' : `Alle ${lines.length} Änderungen`}</button>}
    <div className="mt-3 flex gap-2"><button onClick={onDismiss} className="min-h-[44px] flex-1 rounded-xl bg-fit-accent px-3 text-sm font-semibold text-fit-bg">Verstanden</button><button onClick={onOpenPlans} className="min-h-[44px] rounded-xl border border-fit-line px-3 text-sm">Zum Plan</button></div>
  </section>;
}
