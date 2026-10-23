import { useEffect, useState } from 'react';
import { GitCommitHorizontal, RotateCcw, ChevronDown } from 'lucide-react';
import { listPlanVersions, restorePlanVersion, listPlanReceipts } from '@db';
import { diffSnapshots, hasUnpublishedChanges, snapshotOf } from '../lib/planVersions.js';

const MARK = { add: 'text-green-500', remove: 'text-fit-red', change: 'text-fit-accent' };
const SIGN = { add: '+', remove: '−', change: '~' };

function DiffLines({ lines }) {
  if (!lines.length) return <p className="text-xs text-fit-muted">Keine inhaltlichen Änderungen.</p>;
  return <ul role="list" className="space-y-1 text-xs">{lines.map((l, i) => <li key={i} className="flex gap-2"><span className={`w-3 shrink-0 font-mono font-bold ${MARK[l.kind]}`}>{SIGN[l.kind]}</span><span>{l.text}</span></li>)}</ul>;
}

// Coach: veröffentlichen (Commit mit Nachricht), Änderungen ansehen, Verlauf, frühere Version zurückholen.
export default function PlanVersions({ plan, uid, busy, onPublish, onRestored }) {
  const [message, setMessage] = useState('');
  const [versions, setVersions] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [open, setOpen] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const head = plan.headVersion || 0;
  const dirty = hasUnpublishedChanges(plan);
  const live = plan.status === 'published';
  const legacy = live && !plan.published && !head;
  const pending = !live || !plan.published || dirty;
  const redeploy = !live && head > 0 && !!plan.published && !dirty;
  useEffect(() => {
    let alive = true;
    setLoading(true);
    listPlanVersions(uid, plan.id).then((v) => alive && setVersions(v)).catch(() => alive && setVersions([])).finally(() => alive && setLoading(false));
    listPlanReceipts(uid, plan.id).then((r) => alive && setReceipts(r)).catch(() => alive && setReceipts([]));
    return () => { alive = false; };
  }, [uid, plan.id, head]);
  const readAt = (n) => receipts.find((r) => r.version === n)?.readAt;
  const fmtRead = (iso) => new Date(iso).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const pendingLines = diffSnapshots(plan.published, snapshotOf(plan));

  async function restore(v) {
    if (!confirm(`${dirty ? 'Achtung: Du hast unveröffentlichte Änderungen, sie gehen verloren.\n\n' : ''}Arbeitsstand auf Version ${v.number} zurücksetzen? Der Klient sieht erst nach dem nächsten Veröffentlichen etwas davon.`)) return;
    setError('');
    try { await restorePlanVersion(uid, plan.id, v.id); onRestored?.(); } catch (err) { setError(err.message || 'Zurücksetzen fehlgeschlagen.'); }
  }

  return <div className="mb-4 rounded-xl border border-fit-line bg-fit-bg p-3">
    <p className="flex items-center gap-2 text-xs font-semibold text-fit-muted"><GitCommitHorizontal size={14} className="text-fit-accent" />
      {legacy ? 'Live ohne Version – Änderungen sind für den Klienten sofort sichtbar' : head && live ? `Beim Klienten: Version ${head}${plan.headMessage ? ` · ${plan.headMessage}` : ''}` : head ? `Zurückgezogen · letzte Version ${head}` : 'Noch nicht veröffentlicht'}</p>
    {live && head > 0 && <p role="status" className={`mt-1 text-xs ${readAt(head) ? 'text-green-500' : 'text-fit-muted'}`}>{readAt(head) ? `✓ Klient hat Version ${head} gelesen (${fmtRead(readAt(head))})` : `Version ${head} noch nicht gelesen`}</p>}
    {plan.published && head > 0 && dirty && <div className="mt-2"><p className="mb-1 text-xs font-semibold text-fit-accent">Unveröffentlichte Änderungen ({pendingLines.length})</p><DiffLines lines={pendingLines} /></div>}
    {pending ? <div className="mt-3 space-y-2">
      {!redeploy && <input aria-label="Änderungsnachricht" maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={head ? 'Was hat sich geändert? (z. B. „Woche 3: mehr Volumen“)' : 'Nachricht zur ersten Version (optional)'} className="min-h-[44px] w-full rounded-xl border border-fit-line bg-fit-card p-3 text-sm" />}
      <button disabled={busy} onClick={async () => { await onPublish(redeploy ? '' : message); setMessage(''); }} className="min-h-[44px] w-full rounded-xl bg-fit-accent py-3 text-sm font-semibold text-fit-bg disabled:opacity-50">{redeploy ? `Erneut bereitstellen (Version ${head})` : legacy ? 'Jetzt als Version 1 festschreiben' : live || head ? `Als Version ${head + 1} veröffentlichen` : 'Trainingsplan für Klienten bereitstellen'}</button>
    </div> : <p className="mt-2 text-xs text-green-500">Arbeitsstand entspricht der veröffentlichten Version.</p>}
    {error && <p role="alert" className="mt-2 text-xs text-fit-red">{error}</p>}
    {loading && <p role="status" className="mt-2 text-xs text-fit-muted">Verlauf lädt…</p>}
    {versions.length > 0 && <>
      <button aria-expanded={showLog} onClick={() => setShowLog((v) => !v)} className="mt-3 flex min-h-[44px] items-center gap-1 text-xs text-fit-muted underline">Verlauf ({versions.length}) <ChevronDown size={12} className={showLog ? 'rotate-180' : ''} /></button>
      {showLog && <ol role="list" className="mt-2 space-y-2">{[...versions].reverse().map((v, i, all) => {
        const prev = all[i + 1];
        return <li key={v.id} className="rounded-lg border border-fit-line p-2">
          <button aria-expanded={open === v.id} onClick={() => setOpen(open === v.id ? null : v.id)} className="flex min-h-[44px] w-full items-start justify-between gap-2 text-left text-sm"><span><span className="font-semibold">v{v.number}</span> · {v.message}<span className="block text-[11px] text-fit-muted">{new Date(v.createdAt).toLocaleString('de-AT', { dateStyle: 'short', timeStyle: 'short' })}{v.number === head && live ? ' · aktuell beim Klienten' : ''}{readAt(v.number) ? ` · ✓ gelesen ${fmtRead(readAt(v.number))}` : ''}</span></span></button>
          {open === v.id && <div className="mt-2 space-y-2"><DiffLines lines={diffSnapshots(prev?.snapshot, v.snapshot)} />
            {v.number !== head && <button disabled={busy} onClick={() => restore(v)} className="flex min-h-[44px] items-center gap-1 text-xs text-fit-accent"><RotateCcw size={12} /> Als Arbeitsstand wiederherstellen</button>}</div>}
        </li>;
      })}</ol>}
    </>}
  </div>;
}
