// Overlay: plan-dev/src liegt über fitness-dev/src.
//
// plan-dev hält nur noch, was Plan wirklich anders macht (src/views/Plan, Einstiege,
// Plan-Anpassungen). Alles andere kommt aus dem Nachbar-Checkout fitness-dev/src.
// Gleiche Idee wie vite-miniapp-submodules.mjs in fitness-dev, nur in Gegenrichtung
// (dort: Plan-Views aus plan-dev, Rest aus fitness-dev).
//
// Auflösung für jeden relativen/absoluten Import, der in einer der beiden src-Wurzeln landet:
//   1. plan-dev/src/<rel>      (Plan-eigene Datei oder Override)
//   2. fitness-dev/src/<rel>   (gemeinsame Datei)
// Das gilt auch für Importe aus fitness-dev-Dateien heraus, damit ein Plan-Override
// überall greift. Bare Imports (react, firebase …) aus fitness-dev-Dateien lösen aus dem
// node_modules von plan-dev auf — sonst gäbe es zwei React-/Firebase-Instanzen.
import { dirname, isAbsolute, relative, resolve, sep } from 'path'
import { existsSync, statSync } from 'fs'

const EXTS = ['', '.js', '.jsx', '.mjs', '.json', '/index.js', '/index.jsx']

const inside = (root, p) => p === root || p.startsWith(`${root}${sep}`)
const isFile = (p) => existsSync(p) && statSync(p).isFile()

export function fitnessOverlay({ planRoot, fitnessRoot }) {
  const planSrc = resolve(planRoot, 'src')
  const fitSrc = resolve(fitnessRoot, 'src')

  function pick(rel) {
    for (const root of [planSrc, fitSrc]) {
      for (const ext of EXTS) {
        const candidate = resolve(root, rel) + ext
        if (isFile(candidate)) return candidate
      }
    }
    return null
  }

  return {
    name: 'plan-fitness-overlay',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer || importer.startsWith('\0')) return null
      const [request, query] = source.split('?')
      const importerPath = importer.split('?')[0]

      if (!request.startsWith('.') && !isAbsolute(request)) {
        if (inside(fitSrc, importerPath) && !importerPath.includes(`${sep}node_modules${sep}`)) {
          const hit = await this.resolve(source, resolve(planRoot, 'package.json'), { skipSelf: true })
          if (hit) return hit
        }
        return null
      }

      const target = isAbsolute(request) ? request : resolve(dirname(importerPath), request)
      for (const root of [planSrc, fitSrc]) {
        if (!inside(root, target)) continue
        const hit = pick(relative(root, target))
        return hit ? hit + (query ? `?${query}` : '') : null
      }
      return null
    },
  }
}
