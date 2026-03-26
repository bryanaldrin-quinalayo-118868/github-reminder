import { useEffect, useState } from 'react'
import { GitPullRequest, TriangleAlert } from 'lucide-react'
import { fetchMappings } from '@/config/user-mappings'
import LoginPage from '@/features/auth/LoginPage'
import PRTable from '@/features/dashboard/PRTable'
import NotificationsDialog from '@/components/dashboard/NotificationsDialog'
import SettingsDialog from '@/components/dashboard/SettingsDialog'
import UserMenu from '@/components/dashboard/UserMenu'
import { Button } from '@/components/ui/button'
import { msalInstance, graphScopes } from '@/config/msal'
import { getStoredToken, getStoredUser, clearAuth } from '@/services/github-auth'
import { getTeamsSettings, wasTeamsEverConnected, markTeamsConnected } from '@/config/teams-settings'
import usePullRequests from '@/hooks/usePullRequests'


function TeamsSessionBanner() {
  const [expired, setExpired] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    function checkSession() {
      const accounts = msalInstance.getAllAccounts()
      const teamsSettings = getTeamsSettings()
      const wasPreviouslyConnected = !!teamsSettings.teamId || wasTeamsEverConnected()

      if (accounts.length === 0) {
        setExpired(wasPreviouslyConnected)
        return
      }

      msalInstance
        .acquireTokenSilent({ scopes: graphScopes, account: accounts[0] })
        .then(() => {
          setExpired(false)
          markTeamsConnected()
        })
        .catch(() => {
          setExpired(true)
        })
    }

    checkSession()
    const interval = setInterval(checkSession, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (!expired) return null

  function handleReconnect() {
    setBusy(true)
    msalInstance.loginRedirect({ scopes: graphScopes })
  }

  return (
    <Button
      size='sm'
      variant='ghost'
      className='cursor-pointer gap-1.5 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300'
      onClick={handleReconnect}
      disabled={busy}
    >
      <TriangleAlert className='h-3.5 w-3.5' />
      <span className='text-xs'>{busy ? 'Signing in…' : 'Teams expired — reconnect'}</span>
    </Button>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getStoredToken())
  const [currentUsername, setCurrentUsername] = useState<string | null>(() => getStoredUser()?.login ?? null)
  const { data: prs } = usePullRequests(isAuthenticated)
  const [resetKey, setResetKey] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (isAuthenticated) fetchMappings()
  }, [isAuthenticated])

  function handleLogin() {
    const user = getStoredUser()
    setCurrentUsername(user?.login ?? null)
    setIsAuthenticated(true)
  }

  function handleLogout() {
    clearAuth()
    setIsAuthenticated(false)
    setCurrentUsername(null)
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className='flex h-screen flex-col bg-background mx-auto w-full max-w-[1920px]'>
      {/* Frosted glass header */}
      <header className='glass sticky top-0 z-40 flex shrink-0 items-center justify-between px-4 py-3 sm:px-6'>
        <button
          type='button'
          className='flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1 transition-all hover:bg-accent/60 active:scale-[0.98]'
          onClick={() => setResetKey((k) => k + 1)}
          title='Reset all filters & sorts'
        >
          <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm'>
            <GitPullRequest className='h-5 w-5 text-primary-foreground' />
          </div>
          <div className='text-left'>
            <h1 className='text-base font-semibold tracking-tight'>
              PR Reminder
            </h1>
            <p className='text-[11px] text-muted-foreground'>
              Daycare repositories
            </p>
          </div>
        </button>

        <div className='flex items-center gap-2'>
          <TeamsSessionBanner />
          <UserMenu
            currentUsername={currentUsername}
            prs={prs ?? []}
            onLogout={handleLogout}
            onOpenNotifications={() => setNotificationsOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
      </header>

      {/* Main content */}
      <main className='flex flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6'>
        <PRTable currentUsername={currentUsername} resetKey={resetKey} />
      </main>

      {/* Footer */}
      <footer className='shrink-0 border-t border-border/40 px-4 py-2 sm:px-6'>
        <p className='text-center text-[11px] text-muted-foreground'>
          Want a feature added?{' '}
          <a
            href='https://teams.microsoft.com/l/chat/0/0?users=bryan.quinalayo@nelnetphilippines.com'
            target='_blank'
            rel='noopener noreferrer'
            className='text-primary/80 hover:text-primary transition-colors'
          >
            Hit up @Bryan on Teams
          </a>
        </p>
      </footer>

      {/* Dialogs triggered from UserMenu */}
      <NotificationsDialog
        currentUsername={currentUsername}
        prs={prs ?? []}
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  )
}

export default App
