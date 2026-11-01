import { useEffect, useState } from 'react';
import { planResponses } from '../lib/planResponses.js';

function DeliveryRow({ clientUid, plan, onOpen, compact, store }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setState(null); setError(false);
    if (!plan.headVersion) return undefined;
    const stop = store.watch(clientUid, plan, (value) => { if (active) setState(value); }, () => { if (active) setError(true); }, { latestOnly: true });
    return () => { active = false; stop(); };
  }, [clientUid, plan.id, plan.headVersion, store]);
  const last = state?.entries.at(-1);
  const waiting = last?.senderRole === 'client';
  const receipt = state?.receipt && !state.receipt.pending;
  const status = error ? 'Empfang/Feedback nicht abrufbar' : !plan.headVersion ? 'Älterer Plan ohne Version' : !state || state.loading ? 'Status lädt…' : state.fromCache ? 'Status noch nicht online geprüft' : receipt ? 'Empfang bestätigt' : 'Empfang noch offen';
  return <div className={compact ? 'mt-2 border-t border-fit-line/30 pt-2' : 'rounded-xl border border-fit-line bg-fit-card p-4'}>
    <button type="button" onClick={(event) => { event.stopPropagation(); onOpen?.(plan.id); }} className="min-h-[44px] w-full text-left">
      <span className={`block break-words font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>{plan.name} {plan.headVersion > 0 ? `· v${plan.headVersion}` : ''}</span>
      <span className="mt-1 block text-xs text-fit-muted">{status}</span>
      {!error && state && !state.loading && last && <span className={`mt-1 block text-xs ${waiting ? 'font-semibold text-fit-accent' : 'text-fit-muted'}`}>{last.pending ? 'Speichert…' : waiting ? 'Klient wartet auf Antwort' : 'Coach hat geantwortet'}</span>}
      {!compact && last && <span className="mt-2 block truncate text-sm text-fit-muted">{last.body}</span>}
      {!compact && <span className="mt-2 block text-xs font-semibold text-fit-accent">Plan und Rückmeldungen öffnen →</span>}
    </button>
  </div>;
}

// The workspace can supply its loaded plans; roster rows observe assignments live.
export default function PlanDeliveryOverview({ clientUid, plans: supplied, onOpen, onManage, compact = false, store = planResponses }) {
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState(false);
  const [cached, setCached] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoaded(null); setError(false);
    if (supplied) return undefined;
    const stop = store.watchPlans(clientUid, (value) => { if (active) { setLoaded(value.plans); setCached(value.fromCache); } }, () => { if (active) setError(true); });
    return () => { active = false; stop(); };
  }, [clientUid, supplied, retry, store]);
  const plans = supplied || loaded;
  if (error) return <button className="min-h-[44px] text-left text-xs text-fit-red" onClick={(event) => { event.stopPropagation(); setRetry((n) => n + 1); }}>Planstatus nicht abrufbar · erneut versuchen</button>;
  if (!plans) return <p className="mt-1 text-xs text-fit-muted">Planstatus lädt…</p>;
  const released = plans.filter((plan) => plan.status === 'published');
  const drafts = plans.filter((plan) => plan.status === 'draft');
  return <div aria-label="Planbereitstellung" className="space-y-2">
    {!supplied && cached && <p className="text-xs text-fit-muted">Gespeicherter Planstand · online noch nicht geprüft</p>}
    <p className="text-xs text-fit-muted">{released.length ? `${released.length} Plan${released.length === 1 ? '' : 'e'} bereitgestellt` : 'Noch kein Plan bereitgestellt'}{drafts.length ? ` · ${drafts.length} Entwurf${drafts.length === 1 ? '' : 'e'}` : ''}</p>
    {released.map((plan) => <DeliveryRow key={`${clientUid}:${plan.id}:${plan.headVersion}`} clientUid={clientUid} plan={plan} compact={compact} store={store} onOpen={onOpen} />)}
    {!!drafts.length && onManage && <button type="button" onClick={onManage} className="min-h-[44px] text-sm text-fit-accent">Entwürfe bearbeiten und bereitstellen →</button>}
  </div>;
}
