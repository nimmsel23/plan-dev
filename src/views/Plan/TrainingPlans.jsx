import { useEffect, useState } from "react";
import { Layers, Plus, ChevronDown } from "lucide-react";
import { listMacrocycles, createMacrocycle, getUid } from "@db";
import PlanCard from "./components/PlanCard.jsx";

// Shared plan composition for personal training and the client workspace.
export default function TrainingPlans({ templates, workouts, onChanged, clientUid, clients, onStart }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState('');
  const uid = clientUid || getUid();

  async function load() {
    setLoading(true);
    try { setPlans((await listMacrocycles(uid)).filter((p) => clientUid || p.status !== "draft" || p.coachUid === uid)); } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [uid]);

  function reload() {
    load();
    onChanged?.();
  }

  async function newPlan() {
    if (busy || !name.trim()) return;
    setBusy(true); setError('');
    try {
      const created = await createMacrocycle(uid, { name: name.trim(), coachUid: getUid(), totalWeeks: 10, status: "draft" });
      if (!created) throw new Error("Trainingsplan konnte nicht erstellt werden.");
      setEditingId(created.id); setCreating(false); setName('');
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  if (!loading && plans.length === 0 && !open) return null;

  return (
    <section className="mb-8">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between mb-3 px-1">
        <span className="flex items-center gap-2 text-sm font-bold text-fit-muted uppercase tracking-wide">
          <Layers size={15} className="text-fit-accent" />
          Trainingspläne {!loading && `(${plans.length})`}
        </span>
        <ChevronDown size={16} className={`text-fit-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {error && <p role="alert" className="mb-3 text-sm text-fit-red">{error}</p>}
      {open && (
        <div className="space-y-3">
          {plans.map((p) => (
            <PlanCard key={p.id} initiallyEditing={p.id === editingId} plan={p} templates={templates} workouts={workouts} clientUid={clientUid} clients={clients} onReload={reload} onStart={onStart} />
          ))}
          {creating && <form onSubmit={(e) => { e.preventDefault(); newPlan(); }} className="space-y-2 rounded-xl border border-fit-line p-3"><label className="block text-sm">Name des neuen Plans<input autoFocus aria-label="Neuer Planname" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-xl border border-fit-line bg-fit-bg p-3" /></label><button disabled={busy || !name.trim()} className="vos-btn primary">{busy ? 'Erstellt…' : 'Plan gestalten'}</button><button type="button" disabled={busy} onClick={() => setCreating(false)} className="min-h-[44px] px-3">Abbrechen</button></form>}
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-fit-card hover:bg-fit-accent/10 text-fit-ink text-sm font-medium transition-colors"
          >
            <Plus size={14} /> Neuer Trainingsplan
          </button>
        </div>
      )}
    </section>
  );
}
