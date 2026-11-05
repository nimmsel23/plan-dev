// Schnellstart beim Anlegen eines Plans: fertige Split-Vorlagen mit Trainingstagen und Wochentagen
// (0 = Montag … 6 = Sonntag), plus Satzschemata, die sich mit einem Tipp auf Übungen anwenden lassen.
// Reine Logik ohne Firebase/React, damit sie getestet werden kann.

export const PLAN_PRESETS = [
  { id: 'ppl', label: 'Push / Pull / Legs', hint: '3 Tage', days: [['Push', 0], ['Pull', 2], ['Legs', 4]] },
  { id: 'upper-lower', label: 'Oberkörper / Unterkörper', hint: '4 Tage', days: [['Oberkörper A', 0], ['Unterkörper A', 1], ['Oberkörper B', 3], ['Unterkörper B', 4]] },
  { id: 'fullbody3', label: 'Ganzkörper 3×', hint: '3 Tage', days: [['Ganzkörper A', 0], ['Ganzkörper B', 2], ['Ganzkörper C', 4]] },
  { id: 'empty', label: 'Leer starten', hint: 'Tage selbst anlegen', days: [] },
];

export function buildPresetDays(presetId) {
  const preset = PLAN_PRESETS.find((p) => p.id === presetId);
  if (!preset) return [];
  return preset.days.map(([label, weekday]) => ({
    label, weekdays: [weekday], exercises: [], targetCount: 1, targetPeriodDays: 7, sourceTemplateId: null,
  }));
}

export const SET_SCHEMES = [
  { id: '3x10', label: '3×10', sets: 3, reps: '10' },
  { id: '3x12-15', label: '3×12–15', sets: 3, reps: '12-15' },
  { id: '4x8', label: '4×8', sets: 4, reps: '8' },
  { id: '4x6-8', label: '4×6–8', sets: 4, reps: '6-8' },
  { id: '5x5', label: '5×5', sets: 5, reps: '5' },
];

// Zeiterfassende Übungen (Dauer/Distanz) behalten ihre Vorgaben: ein Wdh-Schema würde sie verfälschen.
export const takesRepScheme = (ex) => !['duration', 'distance_time'].includes(ex.trackingType);

// Setzt Satzanzahl und Wdh; Gewicht, Satz-Typ und Progressionsstufe der ersten Zeile bleiben erhalten.
export function applySchemeToExercise(ex, scheme) {
  if (!takesRepScheme(ex)) return ex;
  const lead = Array.isArray(ex.templateSets) && ex.templateSets[0] ? ex.templateSets[0] : {};
  const templateSets = Array.from({ length: scheme.sets }, (_, i) => ({
    ...lead, setIndex: i + 1, setType: lead.setType || 'normal', targetReps: scheme.reps,
    targetWeight: lead.targetWeight ?? null,
  }));
  return {
    ...ex, templateSets, prescriptionIncomplete: false,
    target_sets: scheme.sets, target_reps: scheme.reps, target_weight: templateSets[0].targetWeight ?? null,
    drop_set: templateSets.some((s) => s.setType === 'drop'),
    effort: templateSets.some((s) => s.setType === 'failure') ? 'to_failure' : 'normal',
  };
}

export const applySchemeToExercises = (exercises = [], scheme) => exercises.map((ex) => applySchemeToExercise(ex, scheme));
