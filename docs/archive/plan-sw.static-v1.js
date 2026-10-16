// Plan Service Worker — App-Shell offline + installierbar.
// Navigation: Netz zuerst (kurzes Timeout) → immer die neueste index.html, Cache nur als Rückfall.
// /assets/* (gehasht, unveränderlich): Cache zuerst, bei Fehlen übers Netz nachladen.
// Alles andere (Firestore, Auth, Fonts, API) läuft unberührt am SW vorbei.
const CACHE = 'vos-plan-v1'
const SHELL = ['./', './index.html', './plan-manifest.webmanifest', './plan-icon-192.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

function networkFirst(req, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false
    const fromCache = () => caches.match(req).then((hit) => hit || caches.match('./index.html'))
    const timer = setTimeout(() => { if (!settled) fromCache().then((r) => { if (r && !settled) { settled = true; resolve(r) } }) }, timeoutMs)
    fetch(req).then((res) => {
      clearTimeout(timer)
      if (settled) return
      settled = true
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
      resolve(res)
    }).catch(() => { clearTimeout(timer); if (!settled) fromCache().then((r) => { settled = true; resolve(r || Response.error()) }) })
  })
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, 4000)); return }
  if (url.pathname.includes('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
      return res
    })))
  }
})
