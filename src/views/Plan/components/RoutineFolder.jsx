import { useState } from "react";
import { ChevronDown, Folder, FolderOpen, Trash2 } from "lucide-react";
import RoutineCard from "./RoutineCard.jsx";

// Strong-artige Ordner: Templates werden nach ihrem `category`-Feld
// gruppiert (statt einer einzigen flachen Liste). Kategorielose Templates
// landen in einem eigenen "Ohne Ordner"-Bereich statt zu verschwinden.
// Leere, manuell angelegte Ordner (siehe WorkoutList::createFolder) zeigen
// einen Löschen-Button im Header, solange keine Routine drin liegt.
export default function RoutineFolder({ label, routines, defaultOpen, onDeleteFolder, ...cardProps }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = open ? FolderOpen : Folder;

  return (
    <section className="mb-4">
      <div className="w-full flex items-center justify-between mb-3 px-1 gap-2">
        <button onClick={() => setOpen((v) => !v)} className="flex-1 flex items-center justify-between min-w-0">
          <span className="flex items-center gap-2 text-sm font-bold text-fit-muted uppercase tracking-wide">
            <Icon size={15} className="text-fit-accent" />
            {label} ({routines.length})
          </span>
          <ChevronDown size={16} className={`text-fit-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {onDeleteFolder && routines.length === 0 && (
          <button
            onClick={() => onDeleteFolder(label)}
            className="p-1.5 rounded-lg text-fit-muted hover:text-fit-red hover:bg-red-500/10 transition-colors"
            title="Leeren Ordner löschen"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {open && (
        routines.length === 0 ? (
          <p className="px-1 text-xs text-fit-muted">Noch keine Routinen in diesem Ordner.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {routines.map((r) => (
              <RoutineCard key={r.id} r={r} {...cardProps} />
            ))}
          </div>
        )
      )}
    </section>
  );
}
