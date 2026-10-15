import { useEffect, useState, useRef } from "react";
import { Dumbbell, Trash2, Pencil, ChevronDown, Play, MoreHorizontal, Check, Folder } from "lucide-react";
import { api } from "../api.js";
import { muskelDe, muskelColor, dedupeMuskeln } from "../../../lib/muscleLabels.js";

// Eine Template-Karte: Vorschau (on-demand geladen, siehe togglePreview),
// Start/Quick-Complete/Bearbeiten-Aktionen, Options-Menü (Umbenennen,
// Ordner setzen, Löschen). Genutzt von RoutineFolder und
// CalisthenicsSkillsSection — kein eigener State außerhalb der Karte selbst.
export default function RoutineCard({ r, onEdit, onStart, onRename, onDelete, onQuickComplete, onSetCategory, completingId }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const completing = completingId === r.id;

  // GET /routines liefert bewusst keine exercises (nur exerciseCount) —
  // Vorschau lädt sie deshalb erst on-demand beim Aufklappen nach, damit
  // man vor "Start"/"Heute erledigt" tatsächlich sieht, was drin ist.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewExercises, setPreviewExercises] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  async function togglePreview() {
    const next = !previewOpen;
    setPreviewOpen(next);
    if (next && previewExercises === null) {
      setPreviewLoading(true);
      try {
        const d = await api.get(`/routines/${r.id}`);
        setPreviewExercises(d.routine?.exercises || []);
      } finally {
        setPreviewLoading(false);
      }
    }
  }

  return (
    <article className="relative p-4 rounded-2xl bg-fit-bg2 border border-fit-line hover:border-fit-accent/50 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-fit-accent/10 flex items-center justify-center flex-shrink-0">
          <Dumbbell size={16} className="text-fit-accent" />
        </div>
        <h3 className="flex-1 min-w-0 font-semibold text-fit-ink truncate leading-tight pt-1.5">{r.name}</h3>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="p-1.5 rounded-lg text-fit-muted hover:text-fit-ink hover:bg-fit-card transition-colors"
            aria-label={`${r.name}: Optionen`}
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-10 w-48 rounded-xl bg-fit-card border border-fit-line shadow-lg overflow-hidden">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onQuickComplete(r); }}
                disabled={completing}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-fit-ink hover:bg-fit-bg2 transition-colors disabled:opacity-50"
              >
                <Check size={14} className="text-fit-accent" /> {completing ? 'Speichert…' : 'Heute als erledigt markieren'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(r.id); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-fit-ink hover:bg-fit-bg2 transition-colors"
              >
                <Pencil size={14} /> Bearbeiten
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRename(r); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-fit-ink hover:bg-fit-bg2 transition-colors"
              >
                <Pencil size={14} /> Umbenennen
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onSetCategory(r); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-fit-ink hover:bg-fit-bg2 transition-colors"
              >
                <Folder size={14} /> Ordner…
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(r.id); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-fit-red hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} /> Löschen
              </button>
            </div>
          )}
        </div>
      </div>

      {r.goal && <p className="text-sm text-fit-muted mb-3 line-clamp-2">{r.goal}</p>}

      <button
        onClick={togglePreview}
        className="w-full flex items-center justify-between gap-1 px-3 py-2 mb-2 rounded-xl bg-fit-card hover:bg-fit-accent/10 text-fit-ink text-sm font-medium transition-colors"
      >
        <span>{r.exerciseCount ?? 0} Übungen ansehen</span>
        <ChevronDown size={16} className={`text-fit-muted transition-transform ${previewOpen ? "rotate-180" : ""}`} />
      </button>

      {previewOpen && (
        <div className="mb-3 rounded-xl bg-fit-bg border border-fit-line/50 divide-y divide-fit-line/30 animate-in fade-in slide-in-from-top-1 duration-150">
          {previewLoading ? (
            <div className="px-3 py-3 text-xs text-fit-muted text-center">Lädt…</div>
          ) : !previewExercises?.length ? (
            <div className="px-3 py-3 text-xs text-fit-muted text-center">Noch keine Übungen in dieser Routine.</div>
          ) : (
            previewExercises.map((ex) => (
              <div key={ex.id} className="px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-fit-ink truncate">{ex.name}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dedupeMuskeln(ex.primaryMuscles).slice(0, 2).map((m) => (
                      <span key={m} className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: muskelColor(m) + "22", color: muskelColor(m) }}>
                        {muskelDe(m)}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs font-mono text-fit-muted shrink-0">
                  {ex.target_sets ?? 3}×{ex.target_reps ?? "8-12"}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onStart(r.id)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-fit-accent text-fit-bg text-sm font-semibold hover:opacity-90 transition-colors"
        >
          <Play size={14} strokeWidth={2.7} /> Start
        </button>
        <button
          onClick={() => onQuickComplete(r)}
          disabled={completing}
          title="Heute als erledigt markieren, ohne Sätze einzeln einzutragen"
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-fit-card hover:bg-fit-accent/10 text-fit-ink text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Check size={14} className={completing ? 'animate-pulse' : ''} />
        </button>
        <button
          onClick={() => onEdit(r.id)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-fit-card hover:bg-fit-accent/10 text-fit-ink text-sm font-medium transition-colors"
          title="Routine bearbeiten"
        >
          <Pencil size={14} />
        </button>
      </div>
    </article>
  );
}
