import { useEffect, useRef, useState } from 'react';
import { Search, X, Info } from 'lucide-react';
import { api } from '../api.js';
import { muskelDe } from '../../../lib/kb/muscles.js';
import ExercisePhotoStrip from '../../../components/ExercisePhotoStrip.jsx';
import CatalogDetail from './CatalogDetail.jsx';

export default function ExerciseSearch({ onAdd, exclude = [] }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const ref = useRef(null);
  const excludeKey = JSON.stringify(exclude);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const d = await api.get(`/exercises?q=${encodeURIComponent(q)}&limit=80`);
        if (alive) { setResults(d.results.filter((ex) => !exclude.includes(ex.id)).slice(0, 20)); setError(''); }
      } catch (err) { if (alive) setError(err.message); }
      finally { if (alive) setLoading(false); }
    }, 180);
    return () => { alive = false; clearTimeout(timer); };
  }, [q, excludeKey]);
  useEffect(() => {
    const outside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);
  async function add(ex) {
    if (adding) return;
    setAdding(true); setError('');
    try { await onAdd(ex); setQ(''); setOpen(false); setDetail(null); }
    catch (err) { setError(err.message || 'Hinzufügen fehlgeschlagen'); }
    finally { setAdding(false); }
  }
  return (
    <div ref={ref} className="relative">
      <label className="flex items-center gap-2 rounded-xl border border-fit-line bg-fit-card px-3 py-3 focus-within:border-fit-accent">
        <Search size={16} className="shrink-0 text-fit-muted" />
        <input aria-label="Übung suchen und hinzufügen" className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }} placeholder="Übung, Muskel oder Equipment suchen…" />
        {q && <button onClick={() => setQ('')} aria-label="Suche leeren"><X size={14} /></button>}
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-fit-red">{error}</p>}
      {open && <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-2xl border border-fit-line bg-fit-bg shadow-xl">
        <div className="px-3 py-2 text-xs text-fit-muted">{loading ? 'Suche…' : q ? 'Suchergebnisse' : 'Yuhonas · Übung auswählen'}</div>
        {!loading && !results.length && <p className="p-4 text-sm text-fit-muted">Keine passenden Übungen. Versuche einen englischen Namen.</p>}
        {results.map((ex) => <div key={ex.id} className="flex items-center border-t border-fit-line/50">
          <button disabled={adding} onClick={() => add(ex)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left hover:bg-fit-card disabled:opacity-50">
            <ExercisePhotoStrip ex={ex} className="h-14 w-20 shrink-0" />
            <span className="min-w-0"><span className="block text-sm font-semibold">{ex.name}</span><span className="block text-xs text-fit-muted">{ex.primaryMuscles.slice(0, 2).map(muskelDe).join(' · ')} · {ex.equipment.join(', ')}</span></span>
          </button>
          <button onClick={() => setDetail(ex)} aria-label={`${ex.name}: Anleitung`} className="p-3 text-fit-accent"><Info size={18} /></button>
        </div>)}
      </div>}
      {detail && <CatalogDetail exercise={detail} onClose={() => setDetail(null)} onAdd={adding ? undefined : add} />}
    </div>
  );
}
