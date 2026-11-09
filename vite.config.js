import { vosChangelog } from './scripts/vos-changelog/vos-changelog-vite.mjs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { existsSync } from 'fs'
import { fitnessOverlay } from './vite-fitness-overlay.mjs'
import { KB_DIR } from './scripts/lib/kb-dir.mjs'

const BACKEND = 'http://localhost:9150'

// Sibling-Repos existieren unter zwei Namen, je nach Checkout-Kontext:
// ~/<name>-dev (Home-Root, dev-Branch-Arbeitskopie) oder
// ~/vitalos/<name>-app (vitalos-Submodule, master-Branch, "habit-app" ist Singular).
// Diese Datei ist in beiden Checkouts identisch (gleiches Repo) — ein hartcodierter
// Pfad kann nur in einem der beiden Kontexte stimmen. Deshalb zur Build-Zeit prüfen,
// welches Sibling tatsächlich existiert, statt es fest zu verdrahten.
function siblingDir(devName, appName) {
  for (const parent of ['..', '../..', '../../..']) {
    for (const name of [appName, devName]) {
      const candidate = resolve(__dirname, parent, name)
      if (existsSync(candidate)) return candidate
    }
  }
  // Home-Dev-Layout (~/dev/<name>-dev): greift, wenn kein Sibling relativ erreichbar
  // ist — Builds aus Temp-Worktrees irgendwo im Dateisystem (z.B. /dev/shm) finden
  // das Overlay-Quell-Repo sonst nie. In CI existiert ~/dev nicht, Verhalten dort
  // bleibt unverändert.
  if (process.env.HOME) {
    const homeDev = resolve(process.env.HOME, 'dev', devName)
    if (existsSync(homeDev)) return homeDev
  }
  return resolve(__dirname, '..', devName)
}

// fitness-dev liefert alles, was Plan nicht selbst überschreibt (Overlay, siehe vite-fitness-overlay.mjs).
// FITNESS_ROOT überschreibt die Nachbar-Suche (~/dev/fitness-dev bzw. ~/vitalos/fitness-app).
const FITNESS_ROOT = process.env.FITNESS_ROOT
  ? resolve(process.env.FITNESS_ROOT)
  : siblingDir('fitness-dev', 'fitness-app')

// Cross-App-Aliase: plan braucht nur @learn (src/App.jsx; @relax bleibt aus Paritätsgründen mit
// fitness-dev) und löst sie über die Nachbar-Checkouts auf (siblingDir) — in jedem Kontext gleich:
// ~/dev/<x>-dev, ~/vitalos/<x>-app oder daneben. Das frühere Paket @vos/cross-app-aliases wurde
// entfernt: es stand als workspace:* in package.json ohne Eintrag im Lockfile, ein Standalone-
// Install mit --frozen-lockfile schlug deshalb fehl.
function resolveCrossAppAliases() {
  return {
    '@relax': resolve(siblingDir('relax-dev', 'relax-app'), 'src'),
    '@learn': resolve(siblingDir('learn-dev', 'learn-app'), 'src'),
    // 6Pack: Quelle ist das Nachbar-Checkout (~/dev/6pack-dev bzw. ~/vitalos/6pack-app), keine Kopie mehr.
    '@6pack': siblingDir('6pack-dev', '6pack-app'),
  }
}

export default defineConfig(async ({ mode }) => {
  const isFirebase = mode === 'firebase' || mode === 'coach' || mode === 'plan'
  const isCoach = mode === 'coach'
  const isPlan = mode === 'plan'
  const crossAppAliases = resolveCrossAppAliases()

  return {
    // Relativ statt absolut — sonst lösen Assets unter einem Funnel-Pfad-
    // Präfix (z.B. /fitness-dev/) fälschlich zur Domain-Wurzel auf (404 →
    // Whitescreen). Core4/Door/Game/Fuel haben denselben Fix schon.
    base: './',
    plugins: [fitnessOverlay({ planRoot: __dirname, fitnessRoot: FITNESS_ROOT }), vosChangelog({ appId: 'plan', appName: 'Plan', accent: '#fb923c' }), react()],
    resolve: {
      preserveSymlinks: true,
      alias: {
        ...crossAppAliases,

        '@src':                resolve(__dirname, './src'),
        '@db':                 resolve(__dirname, isFirebase ? './src/lib/db/index.firestore.app.js' : './src/lib/db/index.js'),
        '@kb':                 KB_DIR, // Fitness-KB: genau eine Quelle (coach-dev/fitness/catalog/kb), keine Kopie in plan-dev
        '@fitness-db':         resolve(__dirname, './src/lib/db'),
        '@utils':              resolve(__dirname, './src/lib/utils.js'),
        '@cloud/firebase.js':  resolve(__dirname, './src/firebase.js'),
        '@firebase-config':    resolve(__dirname, './firebase.config.js'),
        '@fitness/components': resolve(__dirname, './src/components'),
        '@fitness/constants':  resolve(__dirname, './src/constants'),
        '@fitness':            resolve(__dirname, './src'),
        '@components':         resolve(__dirname, './src/components'),
      },
      // Singleton-Dedup: sibling apps bringen eigene node_modules mit — Vite
      // muss React/Firebase trotzdem als Einzelinstanz auflösen.
      dedupe: ['react', 'react-dom', '@tanstack/react-query', 'firebase', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
    },
    server: {
      port: 5902,
      fs: { allow: [__dirname, FITNESS_ROOT, KB_DIR, siblingDir('6pack-dev', '6pack-app')] },
      watch: {
        ignored: [
          '**/dist/**',
          '**/dist-*/**',
          '**/.firebase/**',
          '**/node_modules/**',
          '**/cloud_chamber/vitalos/**',
          '**/cloud_chamber/fitness-dev/**',
          // Python-/Build-/Nested-App-Bäume — kein Frontend-Code, aber viele
          // Dateien (u.a. .venv: 3300+, katalog-ui: 145M node_modules) die
          // chokidar sonst mitüberwacht und den Vite-Dev-Server irgendwann
          // (OOM/EMFILE) abschmieren lassen (beobachtet 2026-09-02).
          '**/.venv/**',
          '**/.worktrees/**',
          '**/__pycache__/**',
          '**/.pytest_cache/**',
          '**/catalog-ui/**',
          '**/functions/**',
          '**/fitness_agent.egg-info/**',
          '**/.git/**',
        ],
      },
      proxy: {
        '/api': BACKEND,
        '/exercises': BACKEND,
        '/session':   BACKEND,
        '/journal':   BACKEND,
        '/coverage':  BACKEND,
        '/plan':      BACKEND,
        '/blocks':    BACKEND,
        '/theme':     BACKEND,
        '/health':    BACKEND,
        '/export':    BACKEND,
        '/fitness':   BACKEND,
        '/firestore': BACKEND,
        '/workouts':  BACKEND,
        '/routines':  BACKEND,
      },
    },
    build: {
      outDir: isCoach ? 'dist-coach' : isPlan ? 'dist-plan' : 'dist',
      // Vite 8 (Rolldown) kennt 'modules' nicht mehr ([BUNDLER_INITIALIZE_ERROR]). Browserliste = altes modules-Kuerzel.
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      rollupOptions: {
        input: isCoach ? resolve(__dirname, 'coach.html') : isPlan ? resolve(__dirname, 'plan.html') : undefined,
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            charts: ['recharts'],
            icons: ['lucide-react'],
            bodymap: ['react-body-highlighter'],
          },
        },
      },
    },
  }
})
