export default function TemplatePicker({ templates, onPick, onCancel }) {
  return (
    <div className="mt-2 rounded-xl bg-fit-bg border border-fit-line/50 divide-y divide-fit-line/30 max-h-56 overflow-y-auto">
      {templates.length === 0 ? (
        <div className="px-3 py-3 text-xs text-fit-muted text-center">Keine Vorlagen.</div>
      ) : (
        templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t)}
            className="w-full text-left px-3 py-2 text-sm text-fit-ink hover:bg-fit-bg2 transition-colors"
          >
            {t.name}
          </button>
        ))
      )}
      <button onClick={onCancel} className="w-full text-left px-3 py-2 text-xs text-fit-muted hover:bg-fit-bg2 transition-colors">
        Abbrechen
      </button>
    </div>
  );
}
