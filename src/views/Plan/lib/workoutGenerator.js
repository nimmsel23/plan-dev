import defaultCatalog from '../data/workoutTemplates.mjs';

export const WORKOUT_CATALOG = defaultCatalog;
const roles = ['main', 'compound', 'isolation', 'skill', 'mobility'];
const fail = (message) => { throw new Error(message); };
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const equipmentName = (item) => item === 'body only' ? 'bodyweight' : item;
const requirements = (exercise) => [...new Set([...exercise.equipment.map(equipmentName), ...(exercise.requires || [])])];
const fitsInventory = (exercise, items) => requirements(exercise).every((item) => items.includes(item));
const prescription = (catalog, template, level, slot, exercise) => ({
  ...catalog.levels[level][slot.role],
  ...template.prescriptions?.[level]?.[slot.role],
  ...exercise.prescriptions?.[level],
  ...slot.prescriptions?.[level],
});

function validatePrescription(dose, label, trackingType) {
  if (!dose || !integer(dose.sets, 1, 10) || !integer(dose.restSeconds, 0, 600) || !(dose.rir === null || integer(dose.rir, 0, 5))) fail(`Ungültige Dosierung: ${label}`);
  if (trackingType === 'duration' || (!trackingType && dose.durationSeconds != null)) {
    if (!integer(dose.durationSeconds, 1, 600) || dose.reps != null) fail(`Ungültige Zeitvorgabe: ${label}`);
  } else {
    if (typeof dose.reps !== 'string' || !/^\d+(?:-\d+)?$/.test(dose.reps) || dose.durationSeconds != null) fail(`Ungültige Dosierung: ${label}`);
    const [low, high = low] = dose.reps.split('-').map(Number);
    if (low < 1 || high < low || high > 100) fail(`Ungültiger Wiederholungsbereich: ${label}`);
  }
}


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
  for (const [id, profile] of Object.entries(catalog.equipmentProfiles || {})) {
    if (!profile.label || !Array.isArray(profile.items) || !profile.items.length || profile.items.some((item) => typeof item !== 'string' || !item)) fail(`Ungültiges Geräteprofil: ${id}`);
  }
  for (const [id, ex] of Object.entries(catalog.exercises)) {
    if (!ex.name || !ex.exercise_id || (!ex.yuhonas_id && !(ex.source?.type === 'coach-template' && ex.source.reference && ex.instructions?.length)) || !['compound', 'isolation', 'skill', 'mobility'].includes(ex.kind) || !['weight_reps', 'bodyweight_reps', 'duration'].includes(ex.trackingType) || !Array.isArray(ex.equipment) || !ex.equipment.length || ex.equipment.some((item) => typeof item !== 'string' || !item) || (ex.requires !== undefined && (!Array.isArray(ex.requires) || ex.requires.some((item) => typeof item !== 'string' || !item)))) fail(`Ungültige Übung: ${id}`);
  }
  for (const [id, selector] of Object.entries(catalog.selectors)) {
    if (!selector.label || !selector.choices?.length || !selector.choices.includes(selector.default) || selector.choices.some((key) => !catalog.exercises[key])) fail(`Ungültige Auswahl: ${id}`);
  }
  for (const [id, profile] of Object.entries(catalog.levels)) {
    if (!profile.label || !profile.notes) fail(`Ungültiges Level: ${id}`);
    for (const role of roles) {
      if (profile[role] || ['main', 'compound', 'isolation'].includes(role)) validatePrescription(profile[role], `${id}/${role}`);
    }
  }
  const names = new Set();
  for (const template of catalog.templates) {
    for (const id of [template.id, ...(template.aliases || [])]) {
      if (!id || names.has(id)) fail(`Doppelte/fehlende Template-ID: ${id}`);
      names.add(id);
    }
    if (!template.name || !catalog.levels[template.defaultLevel] || !integer(template.cycleDays, 1, 31) || !['mixed', 'one-main'].includes(template.compoundPolicy) || !template.routines?.length || !Array.isArray(template.equipment) || !template.equipment.length || template.equipment.some((item) => typeof item !== 'string' || !item)) fail(`Ungültiges Template: ${template.id}`);
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
        if (['skill', 'mobility'].includes(entry.role) && keys.some((key) => catalog.exercises[key].kind !== entry.role)) fail(`Aufgabe und Rolle widersprechen sich: ${template.id}`);
        for (const level of Object.keys(catalog.levels)) for (const key of keys) {
          validatePrescription(prescription(catalog, template, level, entry, catalog.exercises[key]), `${template.id}/${level}/${key}`, catalog.exercises[key].trackingType);
        }
        if (!keys.some((key) => fitsInventory(catalog.exercises[key], template.equipment))) fail(`Geräterahmen ohne passende Übung: ${template.id}/${routine.day}`);
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

export function workoutTemplateChoices(id, catalog = defaultCatalog) {
  const template = findWorkoutTemplate(id, catalog);
  const keys = [...new Set(template.routines.flatMap((r) => r.exercises.map((slot) => slot.selector).filter(Boolean)))];
  return Object.fromEntries(keys.map((key) => [key, catalog.selectors[key].choices.filter((choice) => fitsInventory(catalog.exercises[choice], template.equipment))]));
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
  const knownEquipment = new Set([...Object.values(catalog.equipmentProfiles || {}).flatMap((p) => p.items), ...(catalog.equipmentItems || [])]);
  const availableEquipment = equipment === undefined ? null
    : catalog.equipmentProfiles?.[equipmentId]?.items || ['bodyweight', 'mat', ...equipmentId.split(',').map((item) => item.trim())];
  if (availableEquipment?.some((item) => !knownEquipment.has(item))) fail(`Unbekanntes Equipment: ${equipment}. Profile: ${Object.keys(catalog.equipmentProfiles || {}).join(', ')}; oder kommagetrennte Geräte aus --list.`);
  const dayCount = days === undefined ? undefined : Number(days);
  if (days !== undefined && !integer(dayCount, 2, 6)) fail('Trainingstage müssen eine ganze Zahl von 2 bis 6 sein.');
  if (!variants || typeof variants !== 'object' || Array.isArray(variants)) fail('Varianten müssen eine Auswahl je Übungsplatz enthalten.');

  for (const [key, choice] of Object.entries(variants)) {
    if (!Object.hasOwn(catalog.selectors, key) || !catalog.selectors[key].choices.includes(choice)) fail(`Ungültige Variante ${key}=${choice}. Freigegebene Auswahl aus --list verwenden.`);
  }

  // Only approved selector alternatives may adapt a template to available equipment.
  const exerciseFits = (key, template) => fitsInventory(catalog.exercises[key], template.equipment) && (!availableEquipment || fitsInventory(catalog.exercises[key], availableEquipment));
  const slotChoices = (slot) => slot.selector
    ? (Object.hasOwn(variants, slot.selector) ? [variants[slot.selector]] : catalog.selectors[slot.selector].choices)
    : [slot.exercise];
  const missingEquipment = (template) => [...new Set(template.routines.flatMap((r) => r.exercises.flatMap((slot) => {
    const missing = slotChoices(slot).filter((key) => Object.hasOwn(catalog.exercises, key)).map((key) =>
      requirements(catalog.exercises[key]).filter((item) => !template.equipment.includes(item) || (availableEquipment && !availableEquipment.includes(item))));
    missing.sort((a, b) => a.length - b.length);
    return missing[0] || [];
  })))];
  const conflicts = (t) => [
    ...(Object.keys(variants).some((key) => !t.routines.some((r) => r.exercises.some((slot) => slot.selector === key))) ? ['Übungsauswahl im Template nicht vorhanden'] : []),
    ...(goalId && (t.goal || 'hypertrophy') !== goalId ? [`Ziel ${t.goal || 'hypertrophy'}`] : []),
    ...(dayCount !== undefined && (t.cycleDays !== 7 || t.routines.length !== dayCount) ? [`${t.routines.length} Einheiten / ${t.cycleDays} Tage`] : []),
    ...(missingEquipment(t).length ? [`Equipment unpassend (fehlt: ${missingEquipment(t).map((item) => catalog.equipmentLabels?.[item] || item).join(', ')})`] : []),
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

  const used = new Set(template.routines.flatMap((r) => r.exercises.map((ex) => ex.selector).filter(Boolean)));
  for (const [key, choice] of Object.entries(variants)) {
    if (!used.has(key)) fail(`Auswahl ${key} ist in ${template.id} nicht vorhanden.`);
    if (!catalog.selectors[key].choices.includes(choice)) fail(`Ungültige Variante ${key}=${choice}. Möglich: ${catalog.selectors[key].choices.join(', ')}`);
  }
  const choices = Object.fromEntries([...used].map((key) => {
    const selector = catalog.selectors[key];
    const choice = Object.hasOwn(variants, key) ? variants[key]
      : [selector.default, ...selector.choices].find((choice) => exerciseFits(choice, template));
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
        const dose = prescription(catalog, template, levelId, entry, exercise);
        const timed = exercise.trackingType === 'duration';
        const technique = [exercise.instructions?.join(' '), exercise.coaching?.[levelId],
          exercise.regression && `Leichter: ${exercise.regression}`, exercise.progression && `Schwerer: ${exercise.progression}`].filter(Boolean).join(' ');
        const note = dose.rir === null ? ' Qualität und kontrollierte Ausführung bestimmen die Satzgrenze.'
          : ` Ca. ${dose.rir} Wiederholungen Reserve; Aufwärmsätze bei Kraftübungen zusätzlich.`;

        return {
          ...exercise, id: `generated-${routine.day}-${order}`, order, role: entry.role,
          rest_seconds: dose.restSeconds, rir: dose.rir,
          notes: `${exercise.notes || ''} ${technique}${note}`.trim(),
          templateSets: Array.from({ length: dose.sets }, (_, i) => ({ setIndex: i + 1, setType: 'normal', targetReps: timed ? null : dose.reps, targetWeight: null, targetDuration: timed ? dose.durationSeconds : null })),
        };
      }),
    };
  });
  const neededEquipment = [...new Set(routines.flatMap((r) => r.exercises.flatMap(requirements)))];
  const equipmentSummary = `Geräte/Hilfsmittel: ${neededEquipment.map((item) => catalog.equipmentLabels?.[item] || item).join(', ')}.`;
  return {
    name: `${name.trim()} · ${profile.label}`, totalWeeks, status: 'draft',
    description: [template.name, schedule, equipmentSummary, template.notes, profile.notes, template.progression || catalog.progression, coreBlock?.notes].filter(Boolean).join('\n\n'),
    equipment: neededEquipment,
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
    lines.push('', `## Tag ${routine.cycleDay} – ${text(routine.label)}`, '', '| Übung | Sätze × Wdh./Dauer | Pause | RIR |', '| :--- | :--- | :--- | :--- |');
    for (const ex of routine.exercises) lines.push(`| ${text(ex.name)} | ${ex.templateSets.length} × ${ex.trackingType === 'duration' ? `${ex.templateSets[0].targetDuration} s` : ex.templateSets[0].targetReps} | ${ex.rest_seconds} s | ${ex.rir ?? '—'} |`);
    lines.push('', ...routine.exercises.filter((ex) => ex.notes).map((ex) => `- **${text(ex.name)}:** ${cell(ex.notes)}`));
  }
  if (plan.core) lines.push('', `## ${plan.core.mode === 'guidance' ? 'Coaching-Hinweis' : 'Core als fester Trainingsbaustein'} (${text(plan.core.label)})`, '', plan.core.notes);
  lines.push('', '## Vorgaben und Speicherung', '', 'Arbeitsgewichte bleiben bei Kraftübungen offen. Aufgaben und Dosierungen sind bearbeitbare Coaching-Vorgaben; die Ausgabe allein legt keine Kontodaten oder Trainingslogs an.', '');
  return lines.join('\n');
}
