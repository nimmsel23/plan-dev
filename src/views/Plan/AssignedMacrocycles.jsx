import { useState, useEffect } from 'react'
import { CalendarRange, Dumbbell } from 'lucide-react'
import { useUser } from '../../contexts/UserContext'
import { listMacrocycles, getMacrocycle } from '@db'
import { pickActiveMacrocycle } from './lib/activeMacrocycle.js'

const DAY_KEYS = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so']
const DAY_LABELS = { mo: 'Montag', di: 'Dienstag', mi: 'Mittwoch', do: 'Donnerstag', fr: 'Freitag', sa: 'Samstag', so: 'Sonntag' }

function todayKey() {
  // JS getDay(): 0=So..6=Sa → auf unser mo-so Schema drehen
  const jsDay = new Date().getDay()
  return DAY_KEYS[(jsDay + 6) % 7]
}

// Läuft die Blöcke der Reihe nach durch und bestimmt, in welchem Block/welcher
// Woche der Klient anhand der verstrichenen Zeit seit Zyklus-Start gerade steht.
function locateCurrentWeek(macrocycle) {
  const blocks = macrocycle.blocks || []
  const elapsedWeeks = Math.floor((Date.now() - new Date(macrocycle.createdAt).getTime()) / (7 * 86400000))
  let remaining = Math.max(elapsedWeeks, 0)
  for (const block of blocks) {
    if (remaining < block.weeks.length) {
      return { block, week: block.weeks[remaining] }
    }
    remaining -= block.weeks.length
  }
  // Zyklus durchgelaufen — letzten Block/letzte Woche als Endstand zeigen
  const lastBlock = blocks[blocks.length - 1]
  return lastBlock ? { block: lastBlock, week: lastBlock.weeks[lastBlock.weeks.length - 1] } : { block: null, week: null }
}

export default function AssignedMacrocycles() {
  const { user } = useUser()
  const [cycle, setCycle] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    listMacrocycles(user.uid)
      .then(async (list) => {
        if (list.length === 0) { setCycle(null); return }
        const full = await getMacrocycle(user.uid, pickActiveMacrocycle(list).id)
        setCycle(full)
      })
      .catch(() => setCycle(null))
      .finally(() => setLoading(false))
  }, [user?.uid])

  if (loading || !cycle || !(cycle.blocks || []).length) return null

  const { block, week } = locateCurrentWeek(cycle)
  if (!block || !week) return null

  const today = todayKey()
  const todayPlan = week.days[today]
  const hasExercises = todayPlan && (todayPlan.exercises || []).length > 0

  return (
    <div className="mb-6 space-y-3">
      <h3 className="text-xs font-bold text-fit-dim uppercase flex items-center gap-2 px-1">
        <CalendarRange size={14} className="text-fit-accent" />
        {cycle.name} · Block {block.blockNr} ({block.focus}) · Woche {week.weekNr}
      </h3>

      <div className="rounded-lg bg-fit-accent/10 border border-fit-accent/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-fit-accent/20">
          <div className="text-[10px] font-black uppercase text-fit-accent">Heute — {DAY_LABELS[today]}</div>
          <div className="text-lg font-black text-fit-ink mt-0.5">
            {hasExercises ? (todayPlan.label || 'Training') : 'Ruhetag'}
          </div>
        </div>

        {hasExercises && (
          <div className="divide-y divide-fit-line/20">
            {todayPlan.exercises.map((ex, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dumbbell size={13} className="text-fit-dim flex-shrink-0" />
                  <span className="text-sm font-bold text-fit-ink">{ex.name}</span>
                </div>
                <span className="text-xs font-bold text-fit-dim">
                  {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}kg` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restliche Woche als Kontext, kompakt — kein zweites Riesengrid */}
      <div className="flex gap-1.5 px-1">
        {DAY_KEYS.map(d => {
          const day = week.days[d]
          const active = d === today
          return (
            <div
              key={d}
              className={`flex-1 text-center py-1.5 rounded-md text-[10px] font-black uppercase ${
                active ? 'bg-fit-accent text-black' : day?.exercises?.length ? 'bg-fit-bg2 text-fit-ink' : 'bg-fit-bg2/40 text-fit-dim/40'
              }`}
            >
              {d}
            </div>
          )
        })}
      </div>
    </div>
  )
}
