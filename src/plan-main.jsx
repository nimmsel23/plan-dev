import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LogOut, RefreshCw, ClipboardList } from 'lucide-react'
import PlanView from './views/Plan/index.jsx'
import AuthGateModal from './components/AuthGateModal.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import '@src/styles.css'
import '@src/styles/coach-console.css'
import { UserProvider, useUser } from './contexts/UserContext.jsx'
import { SettingsProvider } from './contexts/SettingsContext.jsx'

const COACH_UIDS = new Set(['59ole36uNpNwml5H6VDYCXyCME92'])

function isCoachUser(user) {
  if (!user) return false
  return COACH_UIDS.has(user.uid) || String(user.email || '').includes('alpha')
}

function PlanShell() {
  const { user, authLoading, signIn, signInEmail, signUpEmail, signOut } = useUser()
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authRegistering, setAuthRegistering] = useState(false)
  const [showEmailAuth, setShowEmailAuth] = useState(false)

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthError('')
    try {
      if (authRegistering) await signUpEmail(authEmail, authPassword)
      else await signInEmail(authEmail, authPassword)
      setShowEmailAuth(false)
    } catch {
      setAuthError('Anmeldung fehlgeschlagen.')
    }
  }

  if (authLoading) {
    return (
      <div className="coach-console min-h-screen flex items-center justify-center bg-fit-bg text-fit-ink">
        <div className="text-fit-dim text-xs font-black uppercase tracking-widest">...</div>
      </div>
    )
  }

  const allowed = isCoachUser(user)

  return (
    <ErrorBoundary>
      <div className="coach-console min-h-screen bg-fit-bg text-fit-ink">
        <header className="sticky top-0 z-40 border-b border-fit-line/40 bg-fit-bg/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-fit-accent text-black shadow-lg shadow-fit-accent/20">
                <ClipboardList size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black tracking-tight">VitalOS Plan</div>
                <div className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-fit-dim">
                  {user?.email || 'Admin Console'}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-fit-line bg-fit-card text-fit-dim transition-colors hover:text-fit-accent"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
              {user && (
                <button
                  type="button"
                  onClick={signOut}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-fit-line bg-fit-card text-fit-dim transition-colors hover:text-fit-red"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </header>

        {allowed ? (
          <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-6">
            <PlanView />
          </main>
        ) : (
          <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
            <div className="card w-full p-8">
              <ClipboardList size={34} className="mx-auto mb-4 text-fit-accent" />
              <h1 className="text-2xl font-black tracking-tight">Plan-Zugang</h1>
              <p className="mt-3 text-sm text-fit-dim">
                Melde dich mit einem Coach-Account an, um Trainingspläne für Klienten zu erstellen.
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setAuthError('')
                    await signIn()
                  } catch {
                    setAuthError('Anmeldung fehlgeschlagen.')
                  }
                }}
                className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black transition-transform active:scale-95"
              >
                Google Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthError('')
                  setShowEmailAuth(true)
                }}
                className="mt-3 w-full text-[10px] font-black uppercase tracking-widest text-fit-dim hover:text-fit-accent"
              >
                Email Login
              </button>
            </div>
          </main>
        )}

        <AuthGateModal
          open={showEmailAuth}
          onClose={() => {
            setAuthError('')
            setShowEmailAuth(false)
          }}
          authEmail={authEmail}
          setAuthEmail={setAuthEmail}
          authPassword={authPassword}
          setAuthPassword={setAuthPassword}
          authError={authError}
          authRegistering={authRegistering}
          setAuthRegistering={setAuthRegistering}
          onSubmit={handleAuthSubmit}
          onGoogleSignIn={async () => {
            try {
              setAuthError('')
              await signIn()
              setShowEmailAuth(false)
            } catch {
              setAuthError('Anmeldung fehlgeschlagen.')
            }
          }}
        />
      </div>
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')).render(
  <UserProvider>
    <SettingsProvider>
      <PlanShell />
    </SettingsProvider>
  </UserProvider>
)
