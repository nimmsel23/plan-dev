import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Dumbbell, Shuffle, Check, ChevronLeft, ListChecks, UtensilsCrossed, BookOpen, Star, Camera, Video, Lightbulb } from 'lucide-react';
import { SIXPACK_CATEGORIES, SIXPACK_EXERCISE_DETAILS, SIXPACK_EXERCISE_POOL, SIXPACK_EXERCISE_COACHING, SIXPACK_CALISTHENICS_SKILLS, SIXPACK_VERIFIED_WORKOUTS } from './sixpackData.js';

const SIXPACK_PROGRAM_KEY = 'fitness-sixpack-program-v1';
const SIXPACK_FAVORITES_KEY = 'fitness-sixpack-favorites-v1';
const SIXPACK_SELFIES_KEY = 'fitness-sixpack-selfies-v1';
const SIXPACK_VIDEO_URLS_KEY = 'fitness-sixpack-video-urls-v1';

function loadVideoUrls() {
  try {
    return JSON.parse(window.localStorage.getItem(SIXPACK_VIDEO_URLS_KEY) || '{}');
  } catch {
    return {};
  }
}

function playableVideoUrl(value) {
  const url = value?.trim();
  return url && (/^https:\/\//i.test(url) || url.startsWith('/')) ? url : null;
}

const EXERCISE_CATEGORIES = SIXPACK_CATEGORIES;
const EXERCISE_POOL = SIXPACK_EXERCISE_POOL;
const EXERCISE_VIDEOS_BY_NAME = Object.fromEntries(
  Object.values(SIXPACK_EXERCISE_DETAILS).map(exercise => [exercise.name, exercise.videoUrl || ''])
);

// Track-Screenshot des Nutzers: Tag 3 und Tag 7 jeder Woche sind REST-Tage.
const REST_DAYS_IN_WEEK = [3, 7];
const DAYS_PER_WEEK = 7;
const PROGRAM_WEEKS = 8;

function formatSeconds(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function shuffleIndices(count) {
  const arr = Array.from({ length: count }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Gleiches Hash-Query-Pattern wie SkillsCard.jsx (getSkillIdFromHash/
// setSkillIdInHash) — bewusst dupliziert statt importiert, damit Timer und
// Skills unabhängig bleiben. App.jsx überschreibt den Hash beim Subtab-
// Wechsel zwar wieder ohne den skill-Query-Param (buildHashRoute kennt ihn
// nicht), aber SkillsCard hat den Wert dann schon aus der useState-
// Initializer-Funktion gelesen, bevor dieser Overwrite greift.
function setSkillIdInHash(skillId) {
  if (typeof window === 'undefined') return;
  const [pathPart = '', queryPart = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(queryPart);
  if (skillId) params.set('skill', skillId);
  else params.delete('skill');
  const query = params.toString();
  window.history.replaceState(null, '', `#${pathPart}${query ? `?${query}` : ''}`);
}

function dayInWeek(day) {
  return ((day - 1) % DAYS_PER_WEEK) + 1;
}

function weekOf(day) {
  return Math.floor((day - 1) / DAYS_PER_WEEK) + 1;
}

function isRestDay(day) {
  return REST_DAYS_IN_WEEK.includes(dayInWeek(day));
}

function getVerifiedWorkout(day) {
  const preset = SIXPACK_VERIFIED_WORKOUTS[day];
  if (!preset) return null;
  return {
    day,
    rest: false,
    items: preset.items.map((item) => ({ ...item })),
    source: preset.source,
  };
}

// Generiert einen Tagesplan im Format des Day-8-Screenshots: 4-6 Übungen
// à 30 oder 60 Sekunden, dazwischen normal ein kurzer 5s-Übergang (unsichtbar
// in der Liste), aber 1-2x pro Workout ein echter Rest-Block (30 oder 45s),
// der als eigene Zeile erscheint — exakt wie "Rest · 45 Seconds" im Screenshot.
function generateDayWorkout(day) {
  if (isRestDay(day)) return { day, rest: true, exercises: [] };

  const verifiedWorkout = getVerifiedWorkout(day);
  if (verifiedWorkout) return verifiedWorkout;

  const exerciseCount = 4 + Math.floor(Math.random() * 3);
  const exercises = shuffleIndices(EXERCISE_POOL.length)
    .slice(0, exerciseCount)
    .map(i => ({ type: 'exercise', name: EXERCISE_POOL[i], seconds: Math.random() < 0.5 ? 30 : 60 }));

  const gapCount = exercises.length - 1;
  const longRestCount = Math.min(gapCount, 1 + Math.round(Math.random()));
  const longRestGaps = shuffleIndices(gapCount).slice(0, longRestCount);

  const items = [];
  exercises.forEach((ex, idx) => {
    items.push(ex);
    if (longRestGaps.includes(idx)) {
      items.push({ type: 'rest', name: 'Rest', seconds: Math.random() < 0.5 ? 30 : 45 });
    }
  });

  return { day, rest: false, items };
}

function loadProgram() {
  if (typeof window === 'undefined') return { currentDay: 1, completedDays: [], workouts: {} };
  try {
    const raw = window.localStorage.getItem(SIXPACK_PROGRAM_KEY);
    if (!raw) return { currentDay: 1, completedDays: [], workouts: {} };
    const parsed = JSON.parse(raw);
    return {
      currentDay: parsed.currentDay || 1,
      completedDays: Array.isArray(parsed.completedDays) ? parsed.completedDays : [],
      workouts: parsed.workouts || {},
    };
  } catch {
    return { currentDay: 1, completedDays: [], workouts: {} };
  }
}

function HomeScreen({ program, onOpenToday, onNav }) {
  const todayDone = program.completedDays.includes(program.currentDay);
  const menuButtons = [
    { id: 'eat', label: 'Eat', Icon: UtensilsCrossed },
    { id: 'track', label: 'Track', Icon: ListChecks },
    { id: 'learn', label: 'Learn', Icon: BookOpen },
    { id: 'shuffle', label: 'Shuffle', Icon: Shuffle },
    { id: 'favorites', label: 'Favorites', Icon: Star },
    { id: 'selfies', label: 'Selfies', Icon: Camera },
  ];

  return (
    <div>
      <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#111' }}>
        <div className="text-xs font-black tracking-[0.3em]" style={{ color: '#e2001a' }}>6PP</div>
        <div className="text-[11px] font-bold" style={{ color: 'var(--dim)' }}>
          Woche {weekOf(program.currentDay)} · Tag {dayInWeek(program.currentDay)}
        </div>
      </div>

      <button
        onClick={onOpenToday}
        className="w-full text-left"
        style={{ background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)' }}
      >
        <div className="h-28 flex items-center justify-center" style={{ background: 'radial-gradient(circle at 30% 30%, #2a2a2a, #0a0a0a)' }}>
          <Dumbbell size={40} color="#333" />
        </div>
        <div className="px-4 py-2.5 text-center text-sm font-black uppercase tracking-[0.12em]" style={{ background: '#e2001a', color: '#fff' }}>
          {todayDone ? `Tag ${program.currentDay} erledigt ✓` : "Today's Workout"}
        </div>
      </button>

      <div className="grid grid-cols-3 gap-px mt-px" style={{ background: 'var(--line)' }}>
        {menuButtons.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => onNav(id)} className="py-5 flex flex-col items-center gap-2" style={{ background: '#141414' }}>
            <Icon size={18} color="#e2001a" />
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-fit-ink">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BackHeader({ label, onBack }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#111' }}>
      <button onClick={onBack} className="text-[#e2001a] flex items-center gap-1 text-sm font-bold">
        <ChevronLeft size={18} /> Home
      </button>
      <div className="flex-1 text-center text-sm font-black text-fit-ink">{label}</div>
      <div style={{ width: 60 }} />
    </div>
  );
}

function EatScreen({ onBack }) {
  return (
    <div>
      <BackHeader label="Eat" onBack={onBack} />
      <div className="p-6 text-center text-sm" style={{ color: 'var(--dim)' }}>
        Kein eigener Meal-Plan-Content — nutz stattdessen Fuel für Ernährungs-Logging.
      </div>
    </div>
  );
}

// Learn ist sein eigener, 6-Pack-spezifischer Fall (kein Ausflug in den
// vollen KB-Katalog): die 21 kuratierten Core-Übungen aus SIXPACK_EXERCISE_DETAILS
// plus die Calisthenics-Skills-Progressionsketten (kb/exercises/calisthenics/,
// SIXPACK_CALISTHENICS_SKILLS) als zweite, eigene Sektion.
function LearnScreen({ onBack, onOpenSkill, onOpenExercise, onOpenNote, coachingNotes }) {
  const [query, setQuery] = useState('');

  const visibleCore = useMemo(() => {
    const list = Object.values(SIXPACK_EXERCISE_DETAILS).sort((a, b) => a.name.localeCompare(b.name));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((ex) => [ex.id, ex.name, ex.category, ex.focusLabel].join(' ').toLowerCase().includes(q));
  }, [query]);

  const visibleSkills = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SIXPACK_CALISTHENICS_SKILLS;
    return SIXPACK_CALISTHENICS_SKILLS.filter((skill) => [skill.id, skill.name, skill.tier, ...skill.progressions].join(' ').toLowerCase().includes(q));
  }, [query]);

  const visibleNotes = useMemo(() => {
    const list = coachingNotes;
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((n) => [n.id, n.title, ...(n.tags || [])].join(' ').toLowerCase().includes(q));
  }, [query, coachingNotes]);

  return (
    <div>
      <BackHeader label="Learn" onBack={onBack} />
      <div className="px-4 py-2 text-[11px] font-bold" style={{ color: 'var(--dim)' }}>
        Core-Übungen aus dem 6-Pack-Programm{onOpenSkill ? ' + Calisthenics-Skill-Progressionen.' : '.'}
      </div>
      <div className="px-4 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Exercise oder Skill suchen..."
          className="w-full rounded-xl px-3 py-2 text-sm"
          style={{ background: '#141414', color: '#fff', border: '1px solid #2a2a2a' }}
        />
      </div>

      <div className="px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#e2001a' }}>
        Core ({visibleCore.length})
      </div>
      <div>
        {visibleCore.map((exercise) => (
          <button
            key={exercise.id}
            onClick={() => onOpenExercise?.(exercise.id)}
            className="w-full px-4 py-3 text-left"
            style={{ background: '#1a1a1a', borderBottom: '1px solid #000' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold" style={{ color: '#fff' }}>{exercise.name}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.1em] mt-1" style={{ color: '#e2001a' }}>
                  {exercise.focusLabel}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold shrink-0" style={{ color: 'var(--dim)' }}>
                <BookOpen size={13} />
                {exercise.verifiedDays.length > 0 ? `Tag ${exercise.verifiedDays.join(', ')}` : 'Pool'}
              </div>
            </div>
          </button>
        ))}
      </div>

      {onOpenSkill && <>
        <div className="px-4 pt-4 pb-1 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#e2001a' }}>
          Calisthenics Skills ({visibleSkills.length})
        </div>
        <div>{visibleSkills.map((skill) => (
          <button
            key={skill.id}
            onClick={() => onOpenSkill?.(skill.id)}
            className="w-full px-4 py-3 text-left"
            style={{ background: '#1a1a1a', borderBottom: '1px solid #000' }}
          >
            <div>
              <div className="text-sm font-bold" style={{ color: '#fff' }}>{skill.name}</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--dim)' }}>
                {skill.progressions.join(' → ')}
              </div>
            </div>
          </button>
        ))}</div>
      </>}

      {visibleNotes.length > 0 && (
        <>
          <div className="px-4 pt-4 pb-1 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#e2001a' }}>
            Wisdom ({visibleNotes.length})
          </div>
          <div>
            {visibleNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => onOpenNote?.(note.id)}
                className="w-full px-4 py-3 text-left flex items-start gap-2.5"
                style={{ background: '#1a1a1a', borderBottom: '1px solid #000' }}
              >
                <Lightbulb size={15} color="#e2001a" className="mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-bold" style={{ color: '#fff' }}>{note.title}</div>
                  {note.summary && (
                    <div className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--dim)' }}>
                      {note.summary.trim()}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NoteDetailScreen({ note, onBack }) {
  if (!note) return null;
  return (
    <div>
      <BackHeader label={note.title} onBack={onBack} />
      <div className="px-4 py-3">
        {note.summary && (
          <div className="text-sm font-bold mb-4" style={{ color: '#fff', background: '#1a1a1a', borderRadius: '0.75rem', padding: '0.7rem 0.9rem' }}>
            {note.summary.trim()}
          </div>
        )}
        {note.body && (
          <div className="text-sm whitespace-pre-line mb-4" style={{ color: 'var(--dim)', lineHeight: 1.6 }}>
            {note.body.trim()}
          </div>
        )}
        {note.follow_up?.length > 0 && (
          <div className="pb-6">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] mb-2" style={{ color: '#e2001a' }}>
              Häufige Rückfragen
            </div>
            <ul className="space-y-2">
              {note.follow_up.map((fu, i) => (
                <li key={i} className="text-sm" style={{ background: '#1a1a1a', borderRadius: '0.75rem', padding: '0.6rem 0.8rem' }}>
                  <div className="font-bold" style={{ color: '#fff' }}>{fu.question}</div>
                  <div className="mt-1" style={{ color: 'var(--dim)' }}>{fu.answer?.trim?.() || fu.answer}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseDetailScreen({ exercise, coaching, onBack }) {
  if (!exercise) return null;
  return (
    <div>
      <BackHeader label={exercise.name} onBack={onBack} />
      <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
        <span
          className="text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md"
          style={{ background: '#2a2a2a', color: '#fff' }}
        >
          {exercise.focusLabel}
        </span>
        {exercise.verifiedDays.length > 0 && (
          <span
            className="text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md flex items-center gap-1"
            style={{ background: '#e2001a', color: '#fff' }}
          >
            <BookOpen size={11} /> Tag {exercise.verifiedDays.join(', ')}
          </span>
        )}
        {(coaching?.equipment || []).map((eq) => (
          <span key={eq} className="text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded-md" style={{ background: '#141414', color: 'var(--dim)', border: '1px solid #2a2a2a' }}>
            {eq}
          </span>
        ))}
      </div>

      {coaching?.coachingNotes?.length > 0 && (
        <div className="px-4 pb-2">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] mb-2" style={{ color: '#e2001a' }}>Ausführung</div>
          <ul className="space-y-2">
            {coaching.coachingNotes.map((note, i) => (
              <li key={i} className="text-sm" style={{ color: '#fff', background: '#1a1a1a', borderRadius: '0.75rem', padding: '0.6rem 0.8rem' }}>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {coaching?.commonErrors?.length > 0 && (
        <div className="px-4 pb-6">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] mb-2" style={{ color: '#e2001a' }}>Häufige Fehler</div>
          <ul className="space-y-2">
            {coaching.commonErrors.map((err, i) => (
              <li key={i} className="text-sm" style={{ color: 'var(--dim)', background: '#141414', border: '1px solid #2a2a2a', borderRadius: '0.75rem', padding: '0.6rem 0.8rem' }}>
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!coaching && (
        <div className="p-6 text-center text-sm" style={{ color: 'var(--dim)' }}>
          Noch keine Coaching-Notizen für diese Übung hinterlegt.
        </div>
      )}
    </div>
  );
}

function loadFavorites() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(SIXPACK_FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
}

function FavoritesScreen({ onBack }) {
  const [favorites, setFavorites] = useState(() => loadFavorites());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.localStorage.setItem(SIXPACK_FAVORITES_KEY, JSON.stringify(favorites));
    return undefined;
  }, [favorites]);

  function toggle(name) {
    setFavorites(current => current.includes(name) ? current.filter(n => n !== name) : [...current, name]);
  }

  return (
    <div>
      <BackHeader label="Favorites" onBack={onBack} />
      <div>
        {EXERCISE_POOL.map(name => {
          const active = favorites.includes(name);
          return (
            <button
              key={name}
              onClick={() => toggle(name)}
              className="w-full px-4 py-3 flex items-center justify-between"
              style={{ background: '#1a1a1a', borderBottom: '1px solid #000' }}
            >
              <span className="text-sm font-bold" style={{ color: '#fff' }}>{name}</span>
              <Star size={16} color={active ? '#e2001a' : '#444'} fill={active ? '#e2001a' : 'none'} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function loadSelfies() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(SIXPACK_SELFIES_KEY) || '[]');
  } catch {
    return [];
  }
}

function SelfiesScreen({ onBack }) {
  const [selfies, setSelfies] = useState(() => loadSelfies());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.localStorage.setItem(SIXPACK_SELFIES_KEY, JSON.stringify(selfies));
    return undefined;
  }, [selfies]);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelfies(current => [{ date: new Date().toISOString(), dataUrl: reader.result }, ...current]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div>
      <BackHeader label="Selfies" onBack={onBack} />
      <label className="block px-4 py-3 text-center text-sm font-black uppercase tracking-[0.12em]" style={{ background: '#e2001a', color: '#fff' }}>
        Foto aufnehmen
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      </label>
      {selfies.length === 0 ? (
        <div className="p-6 text-center text-sm" style={{ color: 'var(--dim)' }}>Noch keine Fortschrittsfotos.</div>
      ) : (
        <div className="grid grid-cols-3 gap-px p-px" style={{ background: 'var(--line)' }}>
          {selfies.map((s, i) => (
            <div key={i} className="aspect-square" style={{ background: '#000' }}>
              <img src={s.dataUrl} alt={new Date(s.date).toLocaleDateString('de-AT')} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShuffleScreen({ onBack, onStart }) {
  const [categoryRoutine] = useState(() => EXERCISE_CATEGORIES.map(cat => ({
    categoryId: cat.id,
    category: cat.label,
    name: cat.exercises[Math.floor(Math.random() * cat.exercises.length)],
    seconds: Math.random() < 0.5 ? 30 : 60,
  })));

  const workout = useMemo(() => {
    const items = [];
    categoryRoutine.forEach((ex, i) => {
      items.push({ type: 'exercise', name: ex.name, seconds: ex.seconds });
      if (i < categoryRoutine.length - 1 && Math.random() < 0.5) {
        items.push({ type: 'rest', name: 'Rest', seconds: Math.random() < 0.5 ? 30 : 45 });
      }
    });
    return { rest: false, items };
  }, [categoryRoutine]);

  return (
    <div>
      <BackHeader label="Shuffle" onBack={onBack} />
      <div className="px-4 py-2 text-[11px] font-bold" style={{ color: 'var(--dim)' }}>
        Ein Übung je Kategorie: Lower Abs → Bottom-up Rotation → Top-down Rotation → Upper Abs.
      </div>
      {categoryRoutine.map(ex => (
        <div key={ex.categoryId} className="px-4 py-3 flex items-center justify-between" style={{ background: '#1a1a1a', borderBottom: '1px solid #000' }}>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: '#e2001a' }}>{ex.category}</div>
            <div className="text-sm font-bold" style={{ color: '#fff' }}>{ex.name}</div>
          </div>
          <span className="text-xs font-bold" style={{ color: 'var(--dim)' }}>{ex.seconds}s</span>
        </div>
      ))}
      <button
        onClick={() => onStart(workout)}
        className="w-full py-4 text-center text-sm font-black uppercase tracking-[0.16em]"
        style={{ background: '#e2001a', color: '#fff' }}
      >
        Start Workout
      </button>
    </div>
  );
}

function TrackScreen({ program, onBack, onOpenDay }) {
  const [week, setWeek] = useState(weekOf(program.currentDay));
  const days = Array.from({ length: DAYS_PER_WEEK }, (_, i) => (week - 1) * DAYS_PER_WEEK + i + 1);

  return (
    <div>
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#111' }}>
        <button onClick={onBack} className="text-[#e2001a] flex items-center gap-1 text-sm font-bold">
          <ChevronLeft size={18} /> Home
        </button>
        <div className="flex-1 text-center text-sm font-black text-fit-ink">Track</div>
        <div style={{ width: 60 }} />
      </div>

      <div className="flex" style={{ background: '#0e0e0e' }}>
        {Array.from({ length: PROGRAM_WEEKS }, (_, i) => i + 1).slice(0, 4).map(w => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className="flex-1 py-2.5 text-xs font-black uppercase tracking-[0.08em]"
            style={{ color: w === week ? '#e2001a' : 'var(--dim)', borderBottom: w === week ? '2px solid #e2001a' : '2px solid transparent' }}
          >
            Week {w}
          </button>
        ))}
      </div>

      <div>
        {days.map(day => {
          const rest = isRestDay(day);
          const done = program.completedDays.includes(day);
          const current = day === program.currentDay;
          return (
            <button
              key={day}
              onClick={() => !rest && onOpenDay(day)}
              disabled={rest}
              className="w-full px-4 py-3.5 flex items-center justify-between disabled:cursor-default"
              style={{ background: current ? '#e2001a' : '#1a1a1a', borderBottom: '1px solid #000' }}
            >
              <span className="text-sm font-bold" style={{ color: '#fff' }}>Day {dayInWeek(day)}</span>
              {rest ? (
                <span className="text-xs font-black uppercase tracking-[0.1em]" style={{ color: '#fff', opacity: 0.7 }}>Rest</span>
              ) : (
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ border: '2px solid #fff', background: done ? '#fff' : 'transparent' }}
                >
                  {done && <Check size={13} color="#e2001a" strokeWidth={4} />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayScreen({ day, workout, onBack, onStart }) {
  const totalSeconds = workout.items.reduce((sum, item) => sum + item.seconds, 0);

  return (
    <div>
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#111' }}>
        <button onClick={onBack} className="text-[#e2001a] flex items-center gap-1 text-sm font-bold">
          <ChevronLeft size={18} /> Train
        </button>
        <div className="flex-1 text-center text-sm font-black text-fit-ink">Day {dayInWeek(day)}</div>
        <div style={{ width: 60 }} />
      </div>

      <div className="py-3 text-center text-sm font-black" style={{ background: '#4a4a4a', color: '#fff' }}>
        Total Workout Time: {formatSeconds(totalSeconds)}
      </div>

      <div>
        {workout.items.map((item, i) => (
          <div
            key={i}
            className="px-4 py-3.5 flex items-center justify-between"
            style={{ background: item.type === 'rest' ? '#151515' : '#1e1e1e', borderBottom: '1px solid #000' }}
          >
            <div>
              <div className="text-sm font-bold" style={{ color: '#fff' }}>{item.name}</div>
              <div className="text-xs font-bold" style={{ color: '#e2001a' }}>{item.seconds} Seconds</div>
            </div>
            {item.type === 'exercise' && (
              <div className="w-10 h-10 rounded" style={{ background: '#2a2a2a' }} />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="w-full py-4 text-center text-sm font-black uppercase tracking-[0.16em]"
        style={{ background: '#e2001a', color: '#fff' }}
      >
        Start Workout
      </button>
    </div>
  );
}

function createRunnerState(workout) {
  return {
    itemIndex: 0,
    remaining: workout.items[0]?.seconds || 0,
    running: false,
    done: workout.items.length === 0,
  };
}

function advanceRunnerState(state, workout) {
  if (!state.running || state.done) return state;
  const remaining = state.remaining - 1;
  if (remaining > 0) return { ...state, remaining };
  const nextIndex = state.itemIndex + 1;
  if (nextIndex >= workout.items.length) return { ...state, remaining: 0, running: false, done: true };
  return { ...state, itemIndex: nextIndex, remaining: workout.items[nextIndex].seconds };
}

function RunnerScreen({ workout, onFinish, onBack }) {
  const [state, setState] = useState(() => createRunnerState(workout));
  const completionReported = useRef(false);
  const announcedIndex = useRef(-1);
  const lastCountdownBeep = useRef(null);
  const audioContext = useRef(null);
  const [videoUrls, setVideoUrls] = useState(loadVideoUrls);
  const [videoError, setVideoError] = useState(false);

  function beep(frequency = 880) {
    const context = audioContext.current;
    if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
  }

  function announce(item) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(item.type === 'rest' ? 'Pause' : item.name);
    utterance.lang = item.type === 'rest' ? 'de-DE' : 'en-US';
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    if (!state.running || state.done || announcedIndex.current === state.itemIndex) return;
    announcedIndex.current = state.itemIndex;
    lastCountdownBeep.current = null;
    setVideoError(false);
    const item = workout.items[state.itemIndex];
    if (!item) return;
    beep(item.type === 'rest' ? 660 : 990);
    announce(item);
  }, [state.itemIndex, state.running, state.done, workout]);

  useEffect(() => {
    const item = workout.items[state.itemIndex];
    if (!state.running || item?.type !== 'rest' || state.remaining > 3 || state.remaining < 1) return;
    if (lastCountdownBeep.current === state.remaining) return;
    lastCountdownBeep.current = state.remaining;
    beep();
  }, [state.itemIndex, state.remaining, state.running, workout]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    audioContext.current?.close();
  }, []);

  useEffect(() => {
    if (!state.running || state.done) return undefined;
    const interval = window.setInterval(() => setState(s => advanceRunnerState(s, workout)), 1000);
    return () => window.clearInterval(interval);
  }, [state.running, state.done, workout]);

  useEffect(() => {
    if (state.done && !completionReported.current) {
      completionReported.current = true;
      onFinish();
    }
  }, [state.done, onFinish]);

  const current = workout.items[state.itemIndex];
  const next = workout.items[state.itemIndex + 1];
  const selectedVideoUrl = current?.type === 'exercise'
    ? (videoUrls[current.name] ?? current.videoUrl ?? EXERCISE_VIDEOS_BY_NAME[current.name] ?? '')
    : '';
  const videoUrl = playableVideoUrl(selectedVideoUrl);

  function toggleRunning() {
    if (!state.running) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass && !audioContext.current) audioContext.current = new AudioContextClass();
      audioContext.current?.resume();
    } else {
      window.speechSynthesis?.cancel();
    }
    setState(s => ({ ...s, running: !s.running }));
  }

  function updateVideoUrl(value) {
    setVideoError(false);
    setVideoUrls(previous => {
      const next = { ...previous, [current.name]: value };
      window.localStorage.setItem(SIXPACK_VIDEO_URLS_KEY, JSON.stringify(next));
      return next;
    });
  }

  if (state.done || !current) {
    return (
      <div className="p-6 text-center">
        <Check size={32} color="#e2001a" className="mx-auto mb-3" />
        <div className="text-lg font-black text-fit-ink">Workout fertig</div>
        <button onClick={onBack} className="mt-5 min-h-12 px-6 rounded-2xl text-sm font-black" style={{ background: '#e2001a', color: '#fff' }}>
          Zurück
        </button>
      </div>
    );
  }

  const isRest = current.type === 'rest';

  return (
    <div className="p-6">
      <button onClick={onBack} className="text-[#e2001a] flex items-center gap-1 text-sm font-bold mb-6">
        <ChevronLeft size={18} /> Abbrechen
      </button>

      <div className="text-center">
        <div className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: '#e2001a' }}>
          {isRest ? 'Rest' : `Übung ${workout.items.slice(0, state.itemIndex + 1).filter(i => i.type === 'exercise').length}`}
        </div>
        <div className="text-2xl font-black text-fit-ink mt-2">{current.name}</div>
        <div className="text-5xl font-black tabular-nums text-fit-ink mt-4">{formatSeconds(state.remaining)}</div>
      </div>

      {!isRest && (
        <div className="mt-6">
          <div className="aspect-video rounded-2xl overflow-hidden flex items-center justify-center text-center" style={{ background: '#111', border: '1px solid var(--line)' }}>
            {videoUrl && !videoError ? (
              <video key={videoUrl} src={videoUrl} autoPlay muted loop playsInline controls className="w-full h-full object-contain" onError={() => setVideoError(true)} />
            ) : (
              <span className="text-xs px-4" style={{ color: 'var(--dim)' }}>
                {videoError ? 'Video konnte nicht geladen werden.' : 'Noch kein Video für diese Übung hinterlegt.'}
              </span>
            )}
          </div>
          <label className="block text-xs font-bold mt-3" style={{ color: 'var(--dim)' }}>
            Video-URL für {current.name}
            <input
              type="url"
              value={selectedVideoUrl}
              onChange={event => updateVideoUrl(event.target.value)}
              placeholder="https://…/uebung.mp4"
              className="block w-full min-h-12 px-3 mt-2 rounded-xl text-sm text-fit-ink"
              style={{ background: 'var(--bg2)', border: '1px solid var(--line)' }}
            />
          </label>
        </div>
      )}

      {next && (
        <div className="text-center text-[11px] font-bold mt-6" style={{ color: 'var(--dim)' }}>
          Als Nächstes: {next.name}
        </div>
      )}

      <div className="flex justify-center mt-6">
        <button
          onClick={toggleRunning}
          className="min-h-12 px-6 rounded-2xl flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em]"
          style={{ background: '#e2001a', color: '#fff' }}
        >
          {state.running ? <Pause size={16} strokeWidth={3} /> : <Play size={16} strokeWidth={3} />}
          {state.running ? 'Pause' : 'Start'}
        </button>
      </div>
    </div>
  );
}

export default function SixPackPromiseCard({ onSubNav, coachingNotes = [] }) {
  const [program, setProgram] = useState(() => loadProgram());
  const [screen, setScreen] = useState('home');
  const [viewDay, setViewDay] = useState(null);
  const [adhocWorkout, setAdhocWorkout] = useState(null);
  const [viewExerciseId, setViewExerciseId] = useState(null);
  const [viewNoteId, setViewNoteId] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.localStorage.setItem(SIXPACK_PROGRAM_KEY, JSON.stringify(program));
    return undefined;
  }, [program]);

  function getWorkout(day) {
    if (program.workouts[day]) return program.workouts[day];
    const workout = generateDayWorkout(day);
    setProgram(p => ({ ...p, workouts: { ...p.workouts, [day]: workout } }));
    return workout;
  }

  function openDay(day) {
    getWorkout(day);
    setViewDay(day);
    setAdhocWorkout(null);
    setScreen('day');
  }

  function goHome() {
    setScreen('home');
  }

  function startWorkout() {
    setScreen('runner');
  }

  // Springt vom Timer-Learn-Screen in den Skills-Subtab und öffnet dort
  // direkt das SkillDetailScreen des angeklickten Skills (gleiche IDs wie
  // SkillsCard.jsx's SKILLS-Array, siehe sixpackData.js-Kommentar).
  function openSkill(skillId) {
    setSkillIdInHash(skillId);
    onSubNav?.('skills');
  }

  function openExercise(exerciseId) {
    setViewExerciseId(exerciseId);
    setScreen('exercise');
  }

  function openNote(noteId) {
    setViewNoteId(noteId);
    setScreen('note');
  }

  function startAdhoc(workout) {
    setAdhocWorkout(workout);
    setViewDay(null);
    setScreen('runner');
  }

  function finishWorkout() {
    if (adhocWorkout) return;
    setProgram(p => ({
      ...p,
      completedDays: p.completedDays.includes(viewDay) ? p.completedDays : [...p.completedDays, viewDay],
      currentDay: viewDay === p.currentDay ? p.currentDay + 1 : p.currentDay,
    }));
  }

  const activeWorkout = adhocWorkout || (viewDay ? getWorkout(viewDay) : null);

  // Solange dieser SubTab offen ist, kippt die ganze App ins 6-Pack-Promise
  // Rot/Schwarz (data-theme-Attribut auf documentElement, gleiches Pattern
  // wie SettingsContext.jsx für normales Theme-Switching). Vorherigen Wert
  // beim Verlassen wiederherstellen statt hart zurückzusetzen.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'sixpack');
    return () => {
      if (previous) root.setAttribute('data-theme', previous);
      else root.removeAttribute('data-theme');
    };
  }, []);

  return (
    <section className="rounded-[1.5rem] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        {screen === 'home' && <HomeScreen program={program} onOpenToday={() => openDay(program.currentDay)} onNav={setScreen} />}
        {screen === 'track' && <TrackScreen program={program} onBack={goHome} onOpenDay={openDay} />}
        {screen === 'eat' && <EatScreen onBack={goHome} />}
        {screen === 'learn' && <LearnScreen onBack={goHome} onOpenSkill={onSubNav ? openSkill : null} onOpenExercise={openExercise} onOpenNote={openNote} coachingNotes={coachingNotes} />}
        {screen === 'exercise' && (
          <ExerciseDetailScreen
            exercise={SIXPACK_EXERCISE_DETAILS[viewExerciseId]}
            coaching={SIXPACK_EXERCISE_COACHING[viewExerciseId]}
            onBack={() => setScreen('learn')}
          />
        )}
        {screen === 'note' && (
          <NoteDetailScreen
            note={coachingNotes.find((n) => n.id === viewNoteId)}
            onBack={() => setScreen('learn')}
          />
        )}
        {screen === 'favorites' && <FavoritesScreen onBack={goHome} />}
        {screen === 'selfies' && <SelfiesScreen onBack={goHome} />}
        {screen === 'shuffle' && <ShuffleScreen onBack={goHome} onStart={startAdhoc} />}
        {screen === 'day' && activeWorkout && (
          activeWorkout.rest ? (
            <div className="p-6 text-center">
              <button onClick={goHome} className="text-[#e2001a] flex items-center gap-1 text-sm font-bold mb-6">
                <ChevronLeft size={18} /> Home
              </button>
              <div className="text-lg font-black text-fit-ink">Rest Day</div>
            </div>
          ) : (
            <DayScreen day={viewDay} workout={activeWorkout} onBack={goHome} onStart={startWorkout} />
          )
        )}
        {screen === 'runner' && activeWorkout && (
          <RunnerScreen workout={activeWorkout} onBack={() => setScreen(adhocWorkout ? 'shuffle' : 'day')} onFinish={finishWorkout} />
        )}
    </section>
  );
}
