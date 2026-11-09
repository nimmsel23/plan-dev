// Chrome DevTools Protocol smoke test, against browser-server + temporary Python backend.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
const pages = await (await fetch('http://127.0.0.1:19222/json')).json()
const ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl)
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }))
let seq = 0
const pending = new Map()
const errors = []
const prompts = []
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq
    const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 10000)
    pending.set(id, {
      resolve: (r) => {
        clearTimeout(timer)
        resolve(r)
      },
      reject: (e) => {
        clearTimeout(timer)
        reject(e)
      },
    })
    ws.send(JSON.stringify({ id, method, params }))
  })
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)
  if (msg.id) {
    const p = pending.get(msg.id)
    if (p) {
      pending.delete(msg.id)
      msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result)
    }
  }
  if (msg.method === 'Runtime.exceptionThrown')
    errors.push(msg.params.exceptionDetails.text + ': ' + (msg.params.exceptionDetails.exception?.description || ''))
  if (msg.method === 'Page.javascriptDialogOpening') {
    console.log('Dialog:', msg.params.message)
    send('Page.handleJavaScriptDialog', { accept: true, promptText: prompts.shift() || '' }).catch(console.error)
  }
})
await send('Runtime.enable')
await send('Page.enable')
await send('Browser.setPermission', {
  permission: { name: 'notifications' },
  setting: 'denied',
  origin: 'http://127.0.0.1:15902',
})
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
  return result.result.value
}
async function wait(expression, label = expression) {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(expression)) return
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`Timed out: ${label}\n${await evaluate('document.body?.innerText')}`)
}
const has = (text) => `document.body?.innerText?.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`
async function click(text, exact = true) {
  console.log('Click:', text)
  const expr = `[...document.querySelectorAll('button')].find((b) => !b.disabled && b.textContent.trim()${exact ? '===' : '.includes('}${JSON.stringify(text)}${exact ? '' : ')'})`
  await wait(`!!(${expr})`, `button ${text}`)
  await evaluate(`(${expr}).click()`)
}
async function fill(selector, value) {
  await wait(`!!document.querySelector(${JSON.stringify(selector)})`)
  await evaluate(
    `(() => { const e = document.querySelector(${JSON.stringify(selector)}); const proto = e.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)}); e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input',{bubbles:true})); })()`,
  )
}
async function labelFill(label, value) {
  const selector = await evaluate(
    `(() => { const l = [...document.querySelectorAll('label')].find((e) => e.textContent.trim() === ${JSON.stringify(label)}); if (!l) throw new Error('missing label'); const e=l.querySelector('input'); e.id='smoke-field'; return '#smoke-field'; })()`,
  )
  await fill(selector, value)
  await evaluate(`document.querySelector('#smoke-field').removeAttribute('id')`)
}
try {
  await send('Page.navigate', { url: 'http://127.0.0.1:15902/scripts/tests/plan-browser.html' })
  await wait(has('Training starten'))
  await evaluate("localStorage.setItem('test-persona','coach'); location.reload()")
  await wait(has('Trainingspläne für Klienten'))
  await click('Trainingspläne für Klienten', false)
  await wait(`!!document.querySelector('option[value="client"]')`)
  await fill('[aria-label="Klient auswählen"]', 'client')
  await click('Vorlagen')
  await fill('[aria-label="Neue Workout-Vorlage"]', 'Push A')
  await click('Erstellen')
  await wait(`!!document.querySelector('[aria-label="Name der Vorlage"]')`)
  await fill('[aria-label="Übung suchen und hinzufügen"]', 'Barbell Bench Press')
  await click('Barbell Bench Press', false)
  await wait(`!!document.querySelector('[aria-label$="Satzvorgaben bearbeiten"]')`)
  assert.ok(
    await evaluate(
      `!![...document.querySelectorAll('label')].find((l) => l.textContent.trim() === 'Ziel-Wdh')?.querySelector('input')`,
    ),
    'basic prescriptions are editable without expanding details',
  )
  assert.equal(
    await evaluate(`document.querySelector('[aria-label$="Satzvorgaben bearbeiten"]').getAttribute('aria-expanded')`),
    'false',
  )
  await wait(`document.querySelector('[aria-label="Übungssuche schließen"]') !== null`)
  await wait(
    `document.querySelector('[aria-label^="Barbell Bench Press"][aria-label$=": Bereits hinzugefügt"]')?.disabled === true`,
  )
  assert.equal(
    await evaluate(`document.querySelector('[aria-label="Übung suchen und hinzufügen"]').value`),
    'Barbell Bench Press',
    'search remains unchanged after adding',
  )
  await click('Fertig')
  await evaluate(`document.querySelector('[aria-label$="Satzvorgaben bearbeiten"]').click()`)
  await labelFill('Ziel-Sätze', '1')
  await labelFill('Ziel-Wdh', '8')
  await labelFill('Ziel-Gewicht', '60')
  await labelFill('Notiz', 'Coach cue from smoke test')
  await click('Speichern')
  await wait(`!document.querySelector('fieldset')?.disabled`)
  await evaluate(`document.querySelector('[aria-label="Zurück zu den Vorlagen"]').click()`)
  await click('Pläne')
  await wait(has('Trainingspläne'))
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await click('Neuer Trainingsplan')
  await fill('[aria-label="Neuer Planname"]', 'PPL Test')
  await click('Plan gestalten')
  await wait(has('Trainingsplan gestalten'))
  await click('+ Trainingstag')
  await labelFill('Name des Trainingstags', 'Push A')
  await fill('[aria-label="Übung suchen und hinzufügen"]', 'Barbell Bench Press')
  await click('Barbell Bench Press', false)
  await wait(`!!document.querySelector('[aria-label$="Satzvorgaben bearbeiten"]')`)
  assert.ok(
    await evaluate(
      `!![...document.querySelectorAll('label')].find((l) => l.textContent.trim() === 'Ziel-Wdh')?.querySelector('input')`,
    ),
    'basic prescriptions are editable without expanding details',
  )
  assert.equal(
    await evaluate(`document.querySelector('[aria-label$="Satzvorgaben bearbeiten"]').getAttribute('aria-expanded')`),
    'false',
  )
  await wait(`document.querySelector('[aria-label="Übungssuche schließen"]') !== null`)
  await wait(
    `document.querySelector('[aria-label^="Barbell Bench Press"][aria-label$=": Bereits hinzugefügt"]')?.disabled === true`,
  )
  assert.equal(
    await evaluate(`document.querySelector('[aria-label="Übung suchen und hinzufügen"]').value`),
    'Barbell Bench Press',
    'search remains unchanged after adding',
  )
  await click('Fertig')
  await evaluate(`document.querySelector('[aria-label$="Satzvorgaben bearbeiten"]').click()`)
  await labelFill('Ziel-Sätze', '1')
  await labelFill('Ziel-Wdh', '8')
  await labelFill('Ziel-Gewicht', '60')
  await labelFill('Notiz', 'Coach cue from smoke test')
  await fill('[aria-label="Übung suchen und hinzufügen"]', 'Dumbbell Bench Press')
  await click('Dumbbell Bench Press', false)
  await wait(`!!document.querySelector('[aria-label*="Dumbbell Bench Press"][aria-label$=": Bereits hinzugefügt"]')`)
  await click('Fertig')
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label$=": Basisvorgaben"]').length`), 2)
  await evaluate(`document.querySelector('[aria-label*="Dumbbell Bench Press"][aria-label$=": Entfernen"]').click()`)
  assert.equal(
    await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),
    true,
    'mobile composer must not overflow',
  )
  await labelFill('Ziel-Wdh', '10')
  await labelFill('Ziel-Wdh', '8')
  await click('Tag duplizieren')
  // Modul/Vorlage an den bestehenden Tag anhängen (6Pack-Tag, Skill oder eigene Vorlage; hier die Vorlage "Push A" von oben, am Duplikat, das danach entfernt wird).
  const modulesBefore = await evaluate(`document.querySelectorAll('[aria-label$=": Basisvorgaben"]').length`)
  await fill(
    '[aria-label="Modul-Workout an diesen Tag anhängen"]',
    await evaluate(
      `[...document.querySelector('[aria-label="Modul-Workout an diesen Tag anhängen"]').options].find((o) => o.text.includes('Push A')).value`,
    ),
  )
  await click('Anhängen')
  await wait(
    `document.querySelectorAll('[aria-label$=": Basisvorgaben"]').length > ${modulesBefore}`,
    'angehängte Übungen erscheinen im Tag',
  )
  await click('Tag nach vorne')
  await click('Tag entfernen')
  assert.equal(
    await evaluate(`document.querySelectorAll('input[aria-label="Übung suchen und hinzufügen"]').length`),
    1,
    'Nach Tag duplizieren/verschieben/entfernen bleibt genau ein Suchfeld stehen',
  )
  await click('Zurück · Entwurf behalten')
  await click('Trainingstage und Übungen bearbeiten', false)
  await wait(has('ungesicherter Entwurf'))
  await click('Entwurf wieder aufnehmen')
  await wait(has('Push A'))
  await click('Klientenvorschau')
  await wait(has('Coach cue from smoke test'))
  assert.equal(
    await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),
    true,
    'mobile editor must not overflow',
  )
  await click('Entwurf sichern')
  await wait(has('1 Übungen'))
  await click('Trainingsplan für Klienten bereitstellen')
  await wait(has('Für diesen Klienten bereitgestellt'))
  console.log('PASS: Coach creates client template, prescriptions and published training plan.')
  // Drill 1/3/5: Mikrozyklus anlegen, speichern, Banner + Fortschrittsbereich sichtbar.
  await click('Mikrozyklus hinzufügen')
  await click('Mikrozyklen speichern')
  await wait(has('Woche 1/1 · Basis'))
  await wait(has('Fortschritt je Mikrozyklus'))
  assert.equal(
    await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),
    true,
    'microcycle editor must not overflow on mobile',
  )
  console.log('PASS: Coach adds a microcycle; banner and per-microcycle progress render.')
  await evaluate("localStorage.setItem('test-persona','client'); location.reload()")
  await wait(has('Training starten'))
  await click('Trainingspläne')
  await wait(has('PPL Test'))
  // Snapshot is started from the published plan, not by quick-completing a checklist.
  await wait(
    `[...document.querySelectorAll('article button')].some((b) => b.textContent.trim() === 'Training starten')`,
  )
  await evaluate(
    `[...document.querySelectorAll('article button')].find((b) => b.textContent.trim() === 'Training starten').click()`,
  )
  await wait(has('Coach cue from smoke test'))
  await fill('input[inputmode="decimal"]', '62.5')
  await fill('input[inputmode="numeric"]', '9')
  await evaluate(`document.querySelector('[aria-label="Satz 1 abschließen"]').click()`)
  await wait(`!!document.querySelector('[aria-label="Satz 1 wieder öffnen"]')`)
  // Reload before autosave debounce completes: restore the durable draft.
  await evaluate('location.reload()')
  await wait(has('Workout läuft'))
  await click('Fortsetzen', false)
  await wait(`document.querySelector('input[inputmode="decimal"]')?.value === '62.5'`)
  await wait(`!!document.querySelector('[aria-label="Satz 1 wieder öffnen"]')`)
  await click('Fertig')
  await wait(has('Gut gemacht!'))
  assert.ok(await evaluate(has('62,5')))
  await click('Zurück zum Training')
  await click('Verlauf')
  await wait(has('Push A'))
  await click('Push A', false)
  await wait(has('Workout wiederholen'))
  await click('Workout wiederholen')
  await wait(has('Coach cue from smoke test'))
  console.log('PASS: Client starts plan, logs actual sets, reloads/restores, finishes and repeats from history.')
  // Catalog works before any exercise history and shows the same Yuhonas source.
  await click('Übungen')
  await wait(has('873 Übungen'))
  await fill('input[placeholder="Übung suchen…"]', 'Barbell Bench Press')
  await click('Barbell Bench Press', false)
  await wait(has('Ausführung · Originaltext'))
  assert.ok(await evaluate(`!!document.querySelector('a[href="https://vos-atlas.web.app"]')`))
  await evaluate(`document.querySelector('[aria-label="Übungsdetails schließen"]').click()`)
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await wait('document.documentElement.scrollWidth <= 390')
  console.log('PASS: Yuhonas catalog, instruction detail, Atlas link and mobile width.')
  const image = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile('/tmp/plan-browser-mobile.png', Buffer.from(image.data, 'base64'))
  assert.deepEqual(errors, [])
  console.log('PASS: No uncaught browser exceptions.')
} catch (err) {
  console.error(err)
  console.error('Browser errors:', errors)
  process.exitCode = 1
} finally {
  ws.close()
}
