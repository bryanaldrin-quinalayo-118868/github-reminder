import { useEffect, useState } from 'react'
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { GitPullRequest, Heart, LogOut, Moon, Sun, TriangleAlert } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fetchMappings } from '@/config/user-mappings'
import LoginPage from '@/features/auth/LoginPage'
import PRTable from '@/features/dashboard/PRTable'
import NotificationsDialog from '@/components/dashboard/NotificationsDialog'
import SettingsDialog from '@/components/dashboard/SettingsDialog'
import { Button } from '@/components/ui/button'
import { msalInstance, graphScopes } from '@/config/msal'
import { getStoredToken, getStoredUser, clearAuth } from '@/services/github-auth'
import { getTeamsSettings } from '@/config/teams-settings'
import usePullRequests from '@/hooks/usePullRequests'


function TeamsSessionBanner() {
  const [expired, setExpired] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    function checkSession() {
      const accounts = msalInstance.getAllAccounts()
      const teamsSettings = getTeamsSettings()
      const wasPreviouslyConnected = !!teamsSettings.teamId

      if (accounts.length === 0) {
        // No MSAL accounts — show banner only if user had Teams configured
        setExpired(wasPreviouslyConnected)
        return
      }

      msalInstance
        .acquireTokenSilent({ scopes: graphScopes, account: accounts[0] })
        .then(() => setExpired(false))
        .catch((err) => {
          if (err instanceof InteractionRequiredAuthError) setExpired(true)
        })
    }

    checkSession()
    const interval = setInterval(checkSession, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (!expired) return null

  async function handleReconnect() {
    setBusy(true)
    try {
      await msalInstance.loginPopup({ scopes: graphScopes })
      setExpired(false)
    } catch {
      // user cancelled or popup blocked — keep banner visible
    } finally {
      setBusy(false)
    }
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

function DonateDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size='sm' variant='ghost' className='cursor-pointer gap-1.5'>
          <Heart className='h-4 w-4' />
          Donate
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-sm text-center'>
        <DialogHeader>
          <DialogTitle>Donate</DialogTitle>
        </DialogHeader>
        <div className='flex flex-col items-center gap-4 py-4'>
          <Heart className='h-12 w-12 text-red-500' />
          <p className='text-lg font-semibold'>Just kidding lol</p>
          <p className='text-sm text-muted-foreground'>
            This app is free. Go buy yourself a coffee instead.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  function cycle() {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
  }

  return (
    <Button size='icon-sm' variant='ghost' className='cursor-pointer' onClick={cycle}>
      <Sun className='h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0' />
      <Moon className='absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
      <span className='sr-only'>Toggle theme</span>
    </Button>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getStoredToken())
  const [currentUsername, setCurrentUsername] = useState<string | null>(() => getStoredUser()?.login ?? null)
  const { data: prs } = usePullRequests(isAuthenticated)
  const [resetKey, setResetKey] = useState(0)

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
    <div className='flex h-screen flex-col bg-background p-4 sm:p-6 mx-auto w-full max-w-[1920px]'>
      <header className='flex shrink-0 items-center justify-between'>
        <button
          type='button'
          className='flex cursor-pointer items-center gap-3 rounded-lg px-1 py-0.5 transition-colors hover:bg-muted/50'
          onClick={() => setResetKey((k) => k + 1)}
          title='Reset all filters & sorts'
        >
          <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary'>
            <GitPullRequest className='h-5 w-5 text-primary-foreground' />
          </div>
          <div className='text-left'>
            <h1 className='text-lg font-semibold tracking-tight'>
              PR Reminder
            </h1>
            <p className='text-xs text-muted-foreground'>
              Daycare repositories
            </p>
          </div>
        </button>
        <div className='flex items-center gap-1'>
          <TeamsSessionBanner />
          <DonateDialog />
          <ThemeToggle />
          <NotificationsDialog currentUsername={currentUsername} prs={prs ?? []} />
          <SettingsDialog />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size='icon-sm' variant='ghost' className='cursor-pointer' onClick={handleLogout}>
                <LogOut className='h-4 w-4' />
                <span className='sr-only'>Sign out</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out ({currentUsername})</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <Separator className='my-4 shrink-0' />

      <PRTable currentUsername={currentUsername} resetKey={resetKey} />

      <p className='shrink-0 pt-2 text-center text-xs text-muted-foreground'>
        Want a feature added?{' '}
        <a
          href='https://teams.microsoft.com/l/chat/0/0?users=bryan.quinalayo@nelnetphilippines.com'
          target='_blank'
          rel='noopener noreferrer'
          className='underline hover:text-foreground'
        >
          Hit up @Bryan on Teams
        </a>.
      </p>
    </div>
  )
}

export default App
