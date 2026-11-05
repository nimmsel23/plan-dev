// Chrome DevTools Protocol smoke test, against browser-server + temporary Python backend.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const pages = await (await fetch('http://127.0.0.1:19222/json')).json();
const ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
let seq = 0;
const pending = new Map();
const errors = [];
const prompts = [];
const send = (method, params = {}) => new Promise((resolve,reject) => { const id = ++seq; const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 10000); pending.set(id,{resolve:(r)=>{ clearTimeout(timer); resolve(r); },reject:(e)=>{ clearTimeout(timer); reject(e); }}); ws.send(JSON.stringify({id,method,params})); });
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id) { const p = pending.get(msg.id); if (p) { pending.delete(msg.id); msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result); } }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text + ': ' + (msg.params.exceptionDetails.exception?.description || ''));
  if (msg.method === 'Page.javascriptDialogOpening') { console.log('Dialog:', msg.params.message); send('Page.handleJavaScriptDialog', { accept: true, promptText: prompts.shift() || '' }).catch(console.error); }
});
await send('Runtime.enable'); await send('Page.enable');
await send('Browser.setPermission', { permission: { name: 'notifications' }, setting: 'denied', origin: 'http://127.0.0.1:15902' });
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression, label = expression) {
  for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await new Promise((r) => setTimeout(r, 100)); }
  throw new Error(`Timed out: ${label}\n${await evaluate('document.body?.innerText')}`);
}
const has = (text) => `document.body?.innerText?.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`;
async function click(text, exact = true) {
  console.log('Click:',text);
  const expr = `[...document.querySelectorAll('button')].find((b) => !b.disabled && b.textContent.trim()${exact ? '===' : '.includes('}${JSON.stringify(text)}${exact ? '' : ')'})`;
  await wait(`!!(${expr})`, `button ${text}`);
  await evaluate(`(${expr}).click()`);
}
async function fill(selector, value) {
  await wait(`!!document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); const proto = e.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)}); e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input',{bubbles:true})); })()`);
}
async function labelFill(label, value) {
  const selector = await evaluate(`(() => { const l = [...document.querySelectorAll('label')].find((e) => e.textContent.trim() === ${JSON.stringify(label)}); if (!l) throw new Error('missing label'); const e=l.querySelector('input'); e.id='smoke-field'; return '#smoke-field'; })()`);
  await fill(selector,value);
  await evaluate(`document.querySelector('#smoke-field').removeAttribute('id')`);
}
try {
  await send('Page.navigate', { url: 'http://127.0.0.1:15902/scripts/tests/session-browser.html' });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await wait(has('Block A'));
  // Woche 2 = Deload: Banner + angepasste Vorgabe (5 Sätze -> 3, RIR 2 -> 4)
  await wait(has('Woche 2/2 · Deload (60 % Volumen, RIR +2)'));
  await wait(has('3×8 @ 60 kg · RIR 4'));
  await click('Mit Vorbereitung loggen');
  await wait(`document.getElementById('draft').textContent.length > 0`);
  const d1 = JSON.parse(await evaluate(`document.getElementById('draft').textContent`));
  assert.match(d1.block, /^Push \[Deload, W2\] · Block A$/);
  assert.equal(d1.exercises[0].setsArray.length, 3);
  assert.deepEqual(d1.exercises[0].setsArray[0], { reps: '', weight: '' });
  assert.match(d1.exercises[0].note, /Ziel: 3×8 @ 60 kg · RIR 4/);
  // andere Einheit frei wählbar
  await click('Pull', false);
  await wait(has('2×8 @ 60 kg'));
  await click('Mit Vorbereitung loggen');
  const d2 = JSON.parse(await evaluate(`document.getElementById('draft').textContent`));
  assert.match(d2.block, /^Pull \[Deload, W2\]/);
  assert.equal(d2.exercises[0].setsArray.length, 2);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'gate must not overflow on mobile');
  console.log('PASS: Session gate shows microcycle, adjusts prescription, lets user pick a unit and builds a prepared draft (mobile width).');
  // Drill 8: „Wie letztes Mal übernehmen“ füllt nur leere Felder, überschreibt nie.
  await click('Wie letztes Mal übernehmen');
  await wait(`document.getElementById('card-state').textContent.length > 0`);
  const sets = JSON.parse(await evaluate(`document.getElementById('card-state').textContent`));
  assert.deepEqual(sets, [{ reps: '8', weight: '60' }, { reps: '10', weight: '62.5' }, { reps: '7', weight: '62.5' }]);
  await wait(has('Werte vom letzten Mal übernommen'));
  await wait(`![...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Wie letztes Mal übernehmen')`);
  console.log('PASS: ExerciseCard adopts last performance into empty fields only, then hides the link.');
  // Drill 4: Launcher listet die Vorlage und liefert nach Klick einen vorbereiteten Entwurf.
  await wait(has('Einzelne Workouts (ohne Plan)'));
  await wait(`!!document.querySelector('#launcher-root button')`);
  await evaluate(`document.querySelector('#launcher-root button').click()`);
  await wait(`document.getElementById('launched').textContent.length > 0`);
  const launched = await evaluate(`document.getElementById('launched').textContent`);
  assert.ok(!launched.startsWith('ERROR'), launched);
  const d3 = JSON.parse(launched);
  assert.match(d3.block, /^Push A$/);
  assert.equal(d3.exercises[0].name, 'Bankdrücken');
  assert.equal(d3.exercises[0].setsArray.length, 3);
  assert.deepEqual(d3.exercises[0].setsArray[0], { reps: '', weight: '' });
  console.log('PASS: TemplateLauncher lists a saved template and builds a prepared draft from it.');
  assert.deepEqual(errors, []);
  console.log('PASS: No uncaught browser exceptions.');
} catch (err) {
  console.error(err);
  console.error('Browser errors:', errors);
  process.exit(1);
} finally {
  ws.close();
}
