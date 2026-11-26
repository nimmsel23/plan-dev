import defaultCatalog from '../data/workoutTemplates.mjs';

export const WORKOUT_CATALOG = defaultCatalog;
const roles = ['main', 'compound', 'isolation'];
const fail = (message) => { throw new Error(message); };
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

// Pure generation: no account, filesystem, network or random exercise selection.
export function validateWorkoutCatalog(catalog) {
  if (catalog?.schemaVersion !== 1) fail('Unbekannte Template-Schemaversion.');
  if (!catalog.levels || !catalog.exercises || !catalog.selectors || !Array.isArray(catalog.templates) || !catalog.templates.length) fail('Unvollständiger Template-Katalog.');
  if (typeof catalog.progression !== 'string' || typeof catalog.core?.notes !== 'string' || !catalog.core.label) fail('Progressions-/Core-Angaben fehlen.');
  if (catalog.coreModules) {
    for (const [id, mod] of Object.entries(catalog.coreModules)) {
      if (!mod.label || typeof mod.notes !== 'string') fail(`Ungültiges Core-Modul: ${id}`);
    }
  }
  for (const [id, ex] of Object.entries(catalog.exercises)) {
    if (!ex.name || !ex.exercise_id || !ex.yuhonas_id || !['compound', 'isolation'].includes(ex.kind) || !Array.isArray(ex.equipment)) fail(`Ungültige Übung: ${id}`);
  }
  for (const [id, selector] of Object.entries(catalog.selectors)) {
    if (!selector.label || !selector.choices?.length || !selector.choices.includes(selector.default) || selector.choices.some((key) => !catalog.exercises[key])) fail(`Ungültige Auswahl: ${id}`);
  }
  for (const [id, profile] of Object.entries(catalog.levels)) {
    if (!profile.label || !profile.notes) fail(`Ungültiges Level: ${id}`);
    for (const role of roles) {
      const p = profile[role];
      if (!p || !integer(p.sets, 1, 10) || !/^\d+(?:-\d+)?$/.test(p.reps) || !integer(p.restSeconds, 0, 600) || !integer(p.rir, 0, 5)) fail(`Ungültige Dosierung: ${id}/${role}`);
      const [low, high = low] = p.reps.split('-').map(Number);
      if (low < 1 || high < low || high > 100) fail(`Ungültiger Wiederholungsbereich: ${id}/${role}`);
    }
  }
  const names = new Set();
  for (const template of catalog.templates) {
    for (const id of [template.id, ...(template.aliases || [])]) {
      if (!id || names.has(id)) fail(`Doppelte/fehlende Template-ID: ${id}`);
      names.add(id);
    }
    if (!template.name || !catalog.levels[template.defaultLevel] || !integer(template.cycleDays, 1, 31) || !['mixed', 'one-main'].includes(template.compoundPolicy) || !template.routines?.length) fail(`Ungültiges Template: ${template.id}`);
    if (template.defaultCore && template.defaultCore !== 'none' && !catalog.coreModules?.[template.defaultCore]) fail(`Unbekannter Template-Core: ${template.id}`);
    let lastDay = 0;
    for (const routine of template.routines) {
      if (!routine.label || !integer(routine.day, 1, template.cycleDays) || routine.day <= lastDay || !routine.exercises?.length) fail(`Ungültiger Zyklustag: ${template.id}`);
      lastDay = routine.day;
      if (routine.exercises.filter((entry) => entry.role === 'main').length > 1) fail(`Mehr als ein Hauptlift: ${template.id}/${routine.day}`);
      routine.exercises.forEach((entry, index) => {
        if (!roles.includes(entry.role) || (!!entry.exercise === !!entry.selector)) fail(`Ungültiger Übungsplatz: ${template.id}/${routine.day}`);
        const keys = entry.selector ? catalog.selectors[entry.selector]?.choices : [entry.exercise];
        if (!keys?.length || keys.some((key) => !catalog.exercises[key])) fail(`Unbekannte Übungsreferenz: ${template.id}/${routine.day}`);
        if (entry.role === 'compound' && keys.some((key) => catalog.exercises[key].kind !== 'compound')) fail(`Compound enthält Isolation: ${template.id}`);
        if (entry.role === 'main' && (index !== 0 || keys.some((key) => catalog.exercises[key].kind !== 'compound'))) fail(`Hauptlift muss zuerst stehen und ein Compound sein: ${template.id}`);
        if (entry.role === 'isolation' && keys.some((key) => catalog.exercises[key].kind !== 'isolation')) fail(`Isolation enthält Compound: ${template.id}`);
        if (template.compoundPolicy === 'one-main' && (entry.role !== (index === 0 ? 'main' : 'isolation'))) fail(`Ein-Compound-Regel verletzt: ${template.id}/${routine.day}`);
      });
    }
  }
  if (!integer(catalog.defaults?.totalWeeks, 1, 52)) fail('Ungültige Standarddauer.');
  for (const id of Object.keys(catalog.levels)) {
    if (!catalog.templates.some((t) => t.id === catalog.defaults[id])) fail(`Standardtemplate fehlt für ${id}`);
  }
  return catalog;
}

export function findWorkoutTemplate(id, catalog = defaultCatalog) {
  const template = catalog.templates.find((t) => t.id === id || t.aliases?.includes(id));
  return template || fail(`Unbekanntes Template: ${id}. Verfügbar: ${catalog.templates.map((t) => t.id).join(', ')}`);
}

export function generateWorkoutPlan({ name, level, template: templateId, goal, equipment, days, variants = {}, weeks, core }, catalog = defaultCatalog) {
  validateWorkoutCatalog(catalog);
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 60 || [...name].some((char) => char.codePointAt(0) < 32 || char.codePointAt(0) === 127)) fail('Name angeben (1–60 Zeichen, eine Zeile).');
  const levelId = typeof level === 'string' ? level.trim().toLowerCase() : '';
  const profile = Object.hasOwn(catalog.levels, levelId) ? catalog.levels[levelId] : null;
  if (!profile) fail(`Unbekanntes Level: ${level}. Verfügbar: ${Object.keys(catalog.levels).join(', ')}`);

  const goalId = goal === undefined ? undefined : String(goal).trim().toLowerCase();
  if (goal !== undefined && !Object.hasOwn(catalog.goals || {}, goalId)) fail(`Unbekanntes Trainingsziel: ${goal}. Verfügbar: ${Object.keys(catalog.goals || {}).join(', ')}`);
  const equipmentId = equipment === undefined ? undefined : String(equipment).trim().toLowerCase();
  if (equipment !== undefined && !['gym', 'dumbbell', 'bodyweight'].includes(equipmentId)) fail(`Unbekanntes Equipment: ${equipment}. Möglich: gym, dumbbell, bodyweight.`);
  const dayCount = days === undefined ? undefined : Number(days);
  if (days !== undefined && !integer(dayCount, 2, 6)) fail('Trainingstage müssen eine ganze Zahl von 2 bis 6 sein.');
  if (!variants || typeof variants !== 'object' || Array.isArray(variants)) fail('Varianten müssen eine Auswahl je Übungsplatz enthalten.');

  // Only approved selector alternatives may adapt a template to available equipment.
  const exerciseFits = (key) => !equipmentId || equipmentId === 'gym' || catalog.exercises[key].equipment.every((item) =>
    ['body only', 'bodyweight'].includes(item) || (equipmentId === 'dumbbell' && item === 'dumbbell'));
  const slotChoices = (slot) => slot.selector
    ? (Object.hasOwn(variants, slot.selector) ? [variants[slot.selector]] : catalog.selectors[slot.selector].choices)
    : [slot.exercise];
  const conflicts = (t) => [
    ...(goalId && (t.goal || 'hypertrophy') !== goalId ? [`Ziel ${t.goal || 'hypertrophy'}`] : []),
    ...(dayCount !== undefined && (t.cycleDays !== 7 || t.routines.length !== dayCount) ? [`${t.routines.length} Einheiten / ${t.cycleDays} Tage`] : []),
    ...(equipmentId && t.routines.some((r) => r.exercises.some((slot) => !slotChoices(slot).some((key) => catalog.exercises[key] && exerciseFits(key)))) ? ['Equipment unpassend'] : []),
  ];
  const preferred = [catalog.defaults.goals?.[goalId]?.[levelId],
    equipmentId === 'dumbbell' ? 'home-dumbbell' : equipmentId === 'bodyweight' ? 'bodyweight-vital' : undefined,
    catalog.defaults[levelId]];
  const ranked = [...catalog.templates].sort((a, b) => {
    const score = (t) => { const index = preferred.indexOf(t.id); return index < 0 ? preferred.length + (t.defaultLevel === levelId ? 0 : 1) : index; };
    return score(a) - score(b);
  });
  const explicit = templateId === undefined ? null : findWorkoutTemplate(templateId, catalog);
  const template = explicit || ranked.find((t) => !conflicts(t).length);
  if (!template || conflicts(template).length) {
    const alternatives = ranked.map((t) => ({ t, reasons: conflicts(t) })).sort((a, b) => a.reasons.length - b.reasons.length).slice(0, 3);
    fail(`${explicit ? `Template ${explicit.id} widerspricht den Vorgaben: ${conflicts(explicit).join("; ")}` : 'Keine passende Vorlage'} (Ziel: ${goalId || 'offen'}, Equipment: ${equipmentId || 'offen'}, Trainingstage/Woche: ${dayCount ?? 'offen'}). Nahe Alternativen, nicht automatisch gewählt: ${alternatives.map(({ t, reasons }) => `${t.id} [${reasons.join('; ') || 'passt'}]`).join(', ')}.`);
  }
  const totalWeeks = weeks ?? catalog.defaults.totalWeeks;
  if (!integer(totalWeeks, 1, 52)) fail('Dauer muss eine ganze Zahl von 1 bis 52 Wochen sein.');

  let coreKey = core;
  if (coreKey === undefined || coreKey === 'auto') {
    if (template.defaultCore) coreKey = template.defaultCore;
    else if (template.goal === 'vitality') coreKey = 'posture';
    else if (template.goal === 'mobility') coreKey = 'mobility';
    else coreKey = '6pack';
  }
  let coreBlock = null;
  if (coreKey !== 'none') {
    const coreEntry = catalog.coreModules?.[coreKey] || (coreKey === '6pack' ? catalog.core : null);
    if (!coreEntry) {
      const valid = [...new Set([...Object.keys(catalog.coreModules || {}), '6pack', 'none'])];
      fail(`Unbekannter Core-Baustein: ${coreKey}. Verfügbar: ${valid.join(', ')}`);
    }
    coreBlock = { id: coreKey, required: true, ...structuredClone(coreEntry) };
  }

  if (!variants || typeof variants !== 'object' || Array.isArray(variants)) fail('Varianten müssen eine Auswahl je Übungsplatz enthalten.');
  const used = new Set(template.routines.flatMap((r) => r.exercises.map((ex) => ex.selector).filter(Boolean)));
  for (const [key, choice] of Object.entries(variants)) {
    if (!used.has(key)) fail(`Auswahl ${key} ist in ${template.id} nicht vorhanden.`);
    if (!catalog.selectors[key].choices.includes(choice)) fail(`Ungültige Variante ${key}=${choice}. Möglich: ${catalog.selectors[key].choices.join(', ')}`);
  }
  const choices = Object.fromEntries([...used].map((key) => {
    const selector = catalog.selectors[key];
    const choice = Object.hasOwn(variants, key) ? variants[key]
      : [selector.default, ...selector.choices].find(exerciseFits);
    return [key, choice];
  }));
  const trainingDays = template.routines.map((r) => r.day);
  const restDays = Array.from({ length: template.cycleDays }, (_, i) => i + 1).filter((day) => !trainingDays.includes(day));
  const schedule = `${template.cycleDays}-Tage-Zyklus; Training an Tag ${trainingDays.join(', ')}, Pause an Tag ${restDays.join(', ') || '—'}.`;
  const routines = template.routines.map((routine, index) => {
    const nextDay = template.routines[index + 1]?.day ?? template.routines[0].day + template.cycleDays;
    const gap = nextDay - routine.day;
    return {
      id: `generated-day-${routine.day}`, label: routine.label, cycleDay: routine.day,
      weekdays: template.cycleDays === 7 ? [routine.day - 1] : [],
      targetCount: 1, targetPeriodDays: template.cycleDays,
      restHoursAfter: gap > 1 ? gap * 24 : 0,
      exercises: routine.exercises.map((entry, order) => {
        const key = entry.selector ? choices[entry.selector] : entry.exercise;
        const exercise = structuredClone(catalog.exercises[key]);
        const dose = profile[entry.role];
        const note = exercise.trackingType === 'bodyweight_reps'
          ? ' Bei Bedarf Unterstützung oder Zusatzgewicht passend zum Wiederholungsziel wählen.'
          : (exercise.trackingType === 'duration' ? ' Fokus auf saubere statische Spannung und kontrollierte Atmung.' : '');
        return {
          ...exercise, id: `generated-${routine.day}-${order}`, order, role: entry.role,
          rest_seconds: dose.restSeconds, rir: dose.rir,
          notes: `${exercise.notes || ''} Kontrollierte Ausführung; ca. ${dose.rir} Wiederholungen Reserve. Aufwärmsätze zusätzlich.${note}`.trim(),
          templateSets: Array.from({ length: dose.sets }, (_, i) => ({ setIndex: i + 1, setType: 'normal', targetReps: dose.reps, targetWeight: null, targetDuration: null })),
        };
      }),
    };
  });
  return {
    name: `${name.trim()} · ${profile.label}`, totalWeeks, status: 'draft',
    description: [template.name, schedule, template.notes, profile.notes, catalog.progression, coreBlock?.notes].filter(Boolean).join('\n\n'),
    generator: { schemaVersion: catalog.schemaVersion, templateId: template.id, templateName: template.name, goal: template.goal, level: levelId, choices },
    schedule: { cycleDays: template.cycleDays, trainingDays, restDays }, core: coreBlock,
    routines,
  };
}

const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
const text = (value) => cell(value).replace(/[\\`*_{}[\]<>#!]/g, '\\$&');
export function workoutPlanMarkdown(plan) {
  const g = plan.generator;
  const description = plan.description.split('\n\n').filter((part) => part !== plan.core?.notes).join('\n\n');
  const goalText = g.goal ? ` · **Ziel:** ${text(g.goal)}` : '';
  const lines = [`# ${text(plan.name)}`, '', `**Template:** ${text(g.templateName)} · **Level:** ${g.level}${goalText} · **Dauer:** ${plan.totalWeeks} Wochen`, '', `**Rhythmus:** ${plan.schedule.cycleDays}-Tage-Zyklus. Pausen: Tag ${plan.schedule.restDays.join(', ') || '—'}.`, '', description, '', '## Zyklusübersicht', '', '| Tag | Einheit |', '| :--- | :--- |'];
  for (let day = 1; day <= plan.schedule.cycleDays; day++) lines.push(`| ${day} | ${text(plan.routines.find((r) => r.cycleDay === day)?.label || 'Pause')} |`);
  for (const routine of plan.routines) {
    lines.push('', `## Tag ${routine.cycleDay} – ${text(routine.label)}`, '', '| Übung | Sätze × Wdh. | Pause | RIR |', '| :--- | :--- | :--- | :--- |');
    for (const ex of routine.exercises) lines.push(`| ${text(ex.name)} | ${ex.templateSets.length} × ${ex.templateSets[0].targetReps} | ${ex.rest_seconds} s | ${ex.rir} |`);
    lines.push('', ...routine.exercises.filter((ex) => ex.notes).map((ex) => `- **${text(ex.name)}:** ${cell(ex.notes)}`));
  }
  if (plan.core) lines.push('', `## Core als fester Trainingsbaustein (${text(plan.core.label)})`, '', plan.core.notes);
  lines.push('', '## Gewichte und Speicherung', '', 'Arbeitsgewichte bleiben offen und werden individuell gewählt. Dieser Plan ist ein bearbeitbarer Entwurf; die Ausgabe allein legt keine Kontodaten oder Trainingslogs an.', '');
  return lines.join('\n');
}
