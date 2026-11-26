import { useEffect, useState } from "react";
import { Layers, Plus, ChevronDown } from "lucide-react";
import { listMacrocycles, createMacrocycle, getUid } from "@db";
import { PLAN_PRESETS, planFromPreset } from "../lib/planPresets.js";

const GOAL_LABELS = {
  hypertrophy: '🏋️ Hypertrophie & Kraft (Gym)',
  vitality: '🌿 Vitalität & Prävention',
  home: '🏠 Home & Minimal Equipment',
  mobility: '🧘 Mobility & Flow',
};
import PlanCard from "../components/PlanCard.jsx";

// Shared plan composition for personal training and the client workspace.
export default function TrainingPlans({ templates, workouts, onChanged, clientUid, clients, onStart }) {
  const [name, setName] = useState('');
  const [presetId, setPresetId] = useState('');
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
      // Sofort mit einem Trainingstag starten — leerer Editor ist der Hauptgrund warum „anlegen“ sich tot anfühlt.
      const created = await createMacrocycle(uid, {
        ...(presetId ? planFromPreset(presetId) : { totalWeeks: 4, routines: [{ label: 'Training 1', weekdays: [0], exercises: [] }] }),
        name: name.trim(),
        coachUid: getUid(),
        status: 'draft',
      });
      if (!created) throw new Error("Trainingsplan konnte nicht erstellt werden.");
      setEditingId(created.id); setCreating(false); setName(''); setPresetId('');
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  if (!loading && plans.length === 0 && !open) return null;

  return (
    <section className="mb-8">
      {clientUid ? (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Pläne {!loading && `(${plans.length})`}</h2>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-fit-accent px-4 text-sm font-semibold text-fit-bg"
            >
              <Plus size={16} /> Neuer Plan
            </button>
          )}
        </div>
      ) : (
        <button onClick={() => setOpen((v) => !v)} className="mb-3 flex w-full items-center justify-between px-1">
          <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-fit-muted">
            <Layers size={15} className="text-fit-accent" />
            Trainingspläne {!loading && `(${plans.length})`}
          </span>
          <ChevronDown size={16} className={`text-fit-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {error && <p role="alert" className="mb-3 text-sm text-fit-red">{error}</p>}
      {(clientUid || open) && (
        <div className="space-y-3">
          {creating && (
            <form onSubmit={(e) => { e.preventDefault(); newPlan(); }} className="space-y-2 rounded-xl border border-fit-accent/40 bg-fit-accent/5 p-3">
              <label className="block text-sm">
                Vorlage
                <select aria-label="Planvorlage" value={presetId} onChange={(e) => { setPresetId(e.target.value); if (e.target.value) setName(PLAN_PRESETS.find((p) => p.id === e.target.value).name); }} className="mt-1 min-h-[44px] w-full rounded-xl border border-fit-line bg-fit-bg p-3">
                  <option value="">Leerer Plan</option>
                  {Object.entries(
                    PLAN_PRESETS.reduce((acc, p) => {
                      const g = p.goal ?? 'hypertrophy';
                      (acc[g] ??= []).push(p);
                      return acc;
                    }, {})
                  ).map(([goal, presets]) => (
                    <optgroup key={goal} label={GOAL_LABELS[goal] ?? goal}>
                      {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              {presetId && <p className="text-xs text-fit-muted">{PLAN_PRESETS.find((p) => p.id === presetId).description}</p>}
              <label className="block text-sm">
                Name
                <input
                  autoFocus
                  aria-label="Neuer Planname"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z. B. Raphael · Einstieg"
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-fit-line bg-fit-bg p-3"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy || !name.trim()} className="vos-btn primary">
                  {busy ? 'Öffnet Editor…' : 'Anlegen & gestalten'}
                </button>
                <button type="button" disabled={busy} onClick={() => { setCreating(false); setName(''); setPresetId(''); }} className="min-h-[44px] px-3">
                  Abbrechen
                </button>
              </div>
            </form>
          )}
          {plans.map((p) => (
            <PlanCard key={p.id} initiallyEditing={p.id === editingId} plan={p} templates={templates} workouts={workouts} clientUid={clientUid} clients={clients} onReload={reload} onStart={onStart} />
          ))}
          {!clientUid && !creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-fit-card px-3 py-2.5 text-sm font-medium text-fit-ink transition-colors hover:bg-fit-accent/10"
            >
              <Plus size={14} /> Neuer Trainingsplan
            </button>
          )}
          {clientUid && !loading && !plans.length && !creating && (
            <p className="rounded-xl border border-dashed border-fit-line p-4 text-sm text-fit-muted">
              Noch kein Plan.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
