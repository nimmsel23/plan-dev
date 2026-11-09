// Deployment runner supporting different targets (Firebase vs. Desktop Local)
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const args = process.argv.slice(2)

// Fitness lebt in 3 physisch getrennten Checkouts mit unterschiedlichem
// Deploy-Ziel — Firebase läuft NUR über fitness-app (vitalos-Submodul), nie
// über fitness-dev oder fitness (Staging). "npm run deploy" ohne Argumente
// muss deshalb je nach cwd auf ein anderes Default-Ziel zeigen, sonst landet
// man versehentlich im (hier falschen) Firebase-Flow, der interaktiv auf
// die Firebase-CLI wartet und wie ein Hang aussieht.
const DEV_SOURCE = `${process.env.HOME}/fitness-dev`
const STAGING_SOURCE = `${process.env.HOME}/fitness`

let mode = 'firebase' // Default (gilt für fitness-app / alles außerhalb der beiden Pfade unten)
let targetFromCwd = null

const cwdNow = process.cwd()
if (cwdNow === STAGING_SOURCE) {
  mode = 'local'
  targetFromCwd = 'prod'
} else if (cwdNow === DEV_SOURCE) {
  mode = 'local'
  targetFromCwd = 'staging'
}

// Parse arguments (both flags and positional arguments)
let modeFromArgs = null
let targetFromArgs = null
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--mode' && i + 1 < args.length) {
    modeFromArgs = args[i + 1]
    i++ // Skip next arg
  } else if (arg.startsWith('--mode=')) {
    modeFromArgs = arg.split('=')[1]
  } else if (arg === 'firebase' || arg === 'local' || arg === 'desktop') {
    modeFromArgs = arg
  } else if (arg === 'staging' || arg === 'prod') {
    targetFromArgs = arg
  }
}

if (modeFromArgs) {
  mode = modeFromArgs.toLowerCase().trim()
} else {
  // Fall back to npm config env var if set and not a boolean placeholder "true"
  const envMode = process.env.npm_config_mode
  if (envMode && envMode !== 'true') {
    mode = envMode.toLowerCase().trim()
  }
}

// Normalize aliases
if (mode === 'desktop') {
  mode = 'local'
}

const target = targetFromArgs || targetFromCwd || 'staging'

// Check if running inside a git worktree, and isolate firebase files
const currentDir = process.cwd()
if (currentDir.includes('/.worktrees/')) {
  const worktreeFitnessPath = path.resolve(currentDir, '../fitness')
  const realFitnessPath = '/home/alpha/fitness'

  if (fs.existsSync(realFitnessPath)) {
    fs.mkdirSync(worktreeFitnessPath, { recursive: true })
    const filesToCopy = ['firebase.json', '.firebaserc', 'firestore.rules', 'firestore.indexes.json']
    for (const file of filesToCopy) {
      const src = path.join(realFitnessPath, file)
      const dest = path.join(worktreeFitnessPath, file)
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        console.log(`📋 Copying ${file} from real fitness to worktree fitness to isolate deployment config...`)
        fs.copyFileSync(src, dest)
      }
    }
  }
}

console.log(`🚀 Starting deployment in mode: ${mode}${mode === 'local' ? ` (target: ${target})` : ''}`)

let cmd
let cmdArgs

if (mode === 'firebase') {
  cmd = 'npm'
  cmdArgs = ['run', 'deploy:firebase']
} else if (mode === 'local') {
  cmd = './deploy.sh'
  cmdArgs = [target]
} else {
  console.error(`❌ Unknown deployment mode: ${mode}`)
  console.error(`Supported modes: 'firebase' (default), 'local' (or 'desktop')`)
  process.exit(1)
}

const p = spawn(cmd, cmdArgs, {
  stdio: 'inherit',
  shell: true,
})

p.on('close', (code) => {
  process.exit(code || 0)
})

p.on('error', (err) => {
  console.error(`❌ Failed to start deployment command:`, err)
  process.exit(1)
})
