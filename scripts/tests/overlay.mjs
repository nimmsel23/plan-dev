// Overlay für Node-Tests ohne Vite: plan-dev/src liegt über fitness-dev/src
// (siehe vite-fitness-overlay.mjs). Fehlt eine Datei in plan-dev/src, kommt sie aus fitness-dev/src.
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const planRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const planSrc = join(planRoot, 'src')

function findFitnessRoot() {
  if (process.env.FITNESS_ROOT) return resolve(process.env.FITNESS_ROOT)
  for (const name of ['fitness-app', 'fitness-dev']) {
    const dir = resolve(planRoot, '..', name)
    if (existsSync(dir)) return dir
  }
  return resolve(planRoot, '..', 'fitness-dev')
}
export const fitnessRoot = findFitnessRoot()
const fitnessSrc = join(fitnessRoot, 'src')

/** Liefert den Pfad in plan-dev/src, sonst das fitness-dev-Gegenstück, sonst den Originalpfad. */
export function overlayPath(file) {
  if (existsSync(file) || !file.startsWith(`${planSrc}${sep}`)) return file
  const alt = join(fitnessSrc, relative(planSrc, file))
  return existsSync(alt) ? alt : file
}

/** Node-Resolver: relative Imports, die in plan-dev/src fehlen, aus fitness-dev/src auflösen. */
export function installNodeOverlay() {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context)
      } catch (error) {
        if (error?.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.') || !context.parentURL?.startsWith('file:')) throw error
        const target = resolve(dirname(fileURLToPath(context.parentURL)), specifier)
        const alt = overlayPath(target)
        if (alt === target) throw error
        return nextResolve(pathToFileURL(alt).href, context)
      }
    },
  })
}
