import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { load as loadYaml } from 'js-yaml';
import { WORKOUT_CATALOG as catalog, generateWorkoutPlan, validateWorkoutCatalog, workoutPlanMarkdown } from '../../src/views/Plan/lib/workoutGenerator.js';
import { PLAN_PRESETS, planFromPreset } from '../../src/views/Plan/lib/planPresets.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = (...args) => spawnSync(process.execPath, [join(root, 'bin/plan-generate'), ...args], { encoding: 'utf8', cwd: tmpdir() });
const build = (options = {}, data = catalog) => generateWorkoutPlan({ name: 'Daniel', level: 'advanced', ...options }, data);

test('all 7 templates × 3 levels generate valid source-backed, independent plans', () => {
  for (const template of catalog.templates) for (const level of Object.keys(catalog.levels)) {
    const plan = build({ template: template.id, level });
    assert.equal(plan.routines.length, template.routines.length);
    assert(plan.description.length <= 2000, `${template.id}: description limit`);
    assert(plan.core.required);
    assert.equal(plan.schedule.cycleDays, template.cycleDays);
    for (const routine of plan.routines) {
      assert.deepEqual(routine.weekdays, template.cycleDays === 7 ? [routine.cycleDay - 1] : []);
      for (const ex of routine.exercises) {
        const path = join(root, 'vendor/free-exercise-db/exercises', `${ex.yuhonas_id}.json`);
        assert(existsSync(path), ex.yuhonas_id);
        const source = JSON.parse(readFileSync(path, 'utf8'));
        assert.deepEqual(ex.primaryMuscles, source.primaryMuscles);
        assert.deepEqual(ex.secondaryMuscles, source.secondaryMuscles);
        assert.equal(ex.templateSets.length, catalog.levels[level][ex.role].sets);
        assert(ex.templateSets.every((s) => s.targetWeight === null && s.targetReps === catalog.levels[level][ex.role].reps));
      }
    }
  }
  const a = build(); a.routines[0].exercises[0].templateSets[0].targetWeight = 100;
  a.routines[0].exercises[0].primaryMuscles.push('not-a-muscle');
  assert.equal(build().routines[0].exercises[0].templateSets[0].targetWeight, null);
  assert(!build().routines[0].exercises[0].primaryMuscles.includes('not-a-muscle'));
});

test('every exercise alternative replaces one slot and preserves the 5×5/isolation boundary', () => {
  for (const template of catalog.templates) {
    const original = build({ template: template.id });
    const selectors = [...new Set(template.routines.flatMap((r) => r.exercises.map((e) => e.selector).filter(Boolean)))];
    for (const key of selectors) for (const choice of catalog.selectors[key].choices) {
      const plan = build({ template: template.id, variants: { [key]: choice } });
      assert.equal(plan.generator.choices[key], choice);
      for (const [i, routine] of plan.routines.entries()) {
        assert.equal(routine.exercises.length, original.routines[i].exercises.length);
        for (const [j, slot] of template.routines[i].exercises.entries()) if (slot.selector === key) {
          assert.equal(routine.exercises[j].yuhonas_id, catalog.exercises[choice].yuhonas_id);
        }
      }
    }
  }
  const plan = build({ variants: { 'chest-press': 'incline-bb', row: 'barbell-row', hinge: 'sumo' } });
  assert.deepEqual(plan.schedule.restDays, [3, 7]);
  assert.equal(plan.routines[0].exercises[0].yuhonas_id, 'Barbell_Incline_Bench_Press_-_Medium_Grip');
  assert.equal(plan.routines[1].exercises[0].yuhonas_id, 'Bent_Over_Barbell_Row');
  assert.equal(plan.routines[4].exercises[0].yuhonas_id, 'Sumo_Deadlift');
  for (const r of plan.routines) {
    assert.equal(r.exercises.filter((e) => e.kind === 'compound').length, 1);
    assert.equal(r.exercises[0].templateSets.length, 5);
    assert(r.exercises.slice(1).every((e) => e.kind === 'isolation'));
    assert(!r.exercises.some((e) => /lunge|split.squat|leg.press/i.test(e.yuhonas_id)));
  }
});

test('six-unit template is an 8-day rotation, never silently a 7-day week', () => {
  const plan = build({ template: 'ppl-six' });
  assert.deepEqual(plan.schedule.trainingDays, [1, 2, 3, 5, 6, 7]);
  assert.deepEqual(plan.schedule.restDays, [4, 8]);
  assert(plan.routines.every((r) => !r.weekdays.length && r.targetPeriodDays === 8));
  assert.equal(plan.routines[2].restHoursAfter, 48);
  assert.equal(plan.routines[5].restHoursAfter, 48);
  assert.match(workoutPlanMarkdown(plan), /\| 8 \| Pause \|/);
});

test('JSON definitions control prescriptions and preset consumers without code changes', () => {
  const custom = structuredClone(catalog);
  custom.levels.intermediate.main.sets = 4;
  assert.equal(build({ level: 'intermediate' }, custom).routines[0].exercises[0].templateSets.length, 4);
  assert.equal(PLAN_PRESETS.length, catalog.templates.length);
  for (const t of catalog.templates) assert.equal(planFromPreset(t.id).routines.length, t.routines.length);
  const first = planFromPreset('five-two-legs');
  first.routines[0].exercises.length = 0;
  assert(planFromPreset('five-two-legs').routines[0].exercises.length);
  assert.equal(build({ template: 'advanced-5x5' }).generator.templateId, 'five-two-legs');
  assert.equal(build({ level: ' Beginner ' }).generator.templateId, 'full-body');
});

test('invalid inputs and malformed catalog fail instead of falling back', () => {
  for (const options of [
    { name: '' }, { name: 'one\ntwo' }, { name: 'x'.repeat(61) },
    { level: 'expert' }, { level: 'constructor' }, { template: 'unknown' },
    { weeks: 0 }, { weeks: 1.5 }, { weeks: 53 }, { core: 'maybe' },
    { variants: { hinge: 'bench' } }, { variants: { absent: 'sumo' } },
    { template: 'daniel-classic-five', variants: { 'vertical-pull': 'pullup' } },
  ]) assert.throws(() => build(options));
  const broken = structuredClone(catalog);
  broken.templates.find((t) => t.id === 'five-two-legs').routines[0].exercises.push({ exercise: 'incline', role: 'compound' });
  assert.throws(() => validateWorkoutCatalog(broken), /Ein-Compound-Regel/);
  const invalid = structuredClone(catalog);
  invalid.levels.beginner.main.reps = '12-8';
  assert.throws(() => validateWorkoutCatalog(invalid), /Wiederholungsbereich/);
});

test('CLI works from another directory and emits parseable JSON, YAML and Markdown', () => {
  const args = ['--name', 'Daniel', '--level', 'intermediate', '--template', 'five-two-legs'];
  const json = cli(...args, '--format', 'json');
  assert.equal(json.status, 0, json.stderr); assert.equal(json.stderr, '');
  assert.equal(JSON.parse(json.stdout).generator.level, 'intermediate');
  const yaml = cli(...args, '--format', 'yaml');
  assert.equal(yaml.status, 0, yaml.stderr);
  assert.deepEqual(loadYaml(yaml.stdout), JSON.parse(json.stdout));
  const md = cli(...args);
  assert.equal(md.status, 0, md.stderr);
  assert.match(md.stdout, /^# Daniel/);
  assert.match(md.stdout, /Core als fester Trainingsbaustein/);
  const noCore = cli('Daniel', '--level', 'beginner', '--core', 'none', '--format', 'json');
  assert.equal(JSON.parse(noCore.stdout).core, null);
  const list = cli('--list', '--format', 'json');
  assert.equal(JSON.parse(list.stdout).templates.length, 7);
});

test('CLI rejects conflicting selections and protects existing output files', () => {
  for (const args of [
    ['Daniel'], ['Daniel', '--level', 'advanced', '--variant', 'hinge'],
    ['Daniel', '--level', 'advanced', '--variant', '__proto__=sumo'],
    ['Daniel', '--level', 'advanced', '--variant', 'hinge=sumo', '--variant', 'hinge=hinge'],
    ['Daniel', '--level', 'intermediate', '--format', 'pdf'],
    ['Daniel', 'Other', '--level', 'beginner'], ['Daniel', '--name', 'Other', '--level', 'beginner'],
  ]) { const r = cli(...args); assert.equal(r.status, 2); assert.equal(r.stdout, ''); assert(r.stderr); }
  const dir = mkdtempSync(join(tmpdir(), 'plan-generator-'));
  try {
    const output = join(dir, 'plan.md');
    assert.equal(cli('Daniel', '--level', 'advanced', '--output', output).status, 0);
    const original = readFileSync(output, 'utf8');
    const repeat = cli('Daniel', '--level', 'beginner', '--output', output);
    assert.equal(repeat.status, 2); assert.match(repeat.stderr, /existiert bereits/);
    assert.equal(readFileSync(output, 'utf8'), original);
    const custom = structuredClone(catalog); custom.levels.beginner.main.sets = 1;
    const config = join(dir, 'templates.json'); writeFileSync(config, JSON.stringify(custom));
    const r = cli('Daniel', '--level', 'beginner', '--catalog', config, '--format', 'json');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).routines[0].exercises[0].templateSets.length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
