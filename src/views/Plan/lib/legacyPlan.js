// Read-only import boundary: the original ClientForge file remains untouched.
export function importClientForge(raw) {
  const value = (v) => { if (v == null || String(v).trim() === '') return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
  return {
    name: raw.name || 'Übernommener Trainingsplan', description: raw.beschreibung || raw.ziel || '', totalWeeks: 10,
    routines: (raw.einheiten || []).map((day, index) => ({
      id: `import-day-${index}`, label: day.name || `Training ${index + 1}`, weekdays: [], targetCount: 1, targetPeriodDays: 7,
      exercises: (day.abschnitte || []).flatMap((s) => s['übungen'] || []).map((ex, i) => ({
        id: `import-ex-${i}`, exercise_id: ex.id || null, name: ex.name || 'Übung', notes: ex.notiz || ex.hinweis || '',
        rest_seconds: /min/i.test(String(ex.pause)) ? (value(String(ex.pause).replace(/[^0-9.,]/g, '')) ?? 1.5) * 60 : value(ex.pause) ?? 90,
        primaryMuscles: [], secondaryMuscles: [], equipment: [], trackingType: ex.gewicht === 'BW' ? 'bodyweight_reps' : 'weight_reps',
        templateSets: Array.from({ length: Math.max(1, Math.min(30, value(ex['sätze']) || 3)) }, (_, n) => ({ setIndex: n + 1, setType: 'normal', targetReps: ex.wdh || '8-12', targetWeight: ex.gewicht === 'BW' ? null : value(ex.gewicht), targetDuration: null })),
      })),
    })),
  };
}
