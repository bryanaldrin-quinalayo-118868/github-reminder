import { useEffect, useState } from 'react'
import { GitPullRequest, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Separator } from '@/components/ui/separator'
import { getGitHubUsername } from '@/config/github-identity'
import { fetchMappings } from '@/config/user-mappings'
import PRTable from '@/features/dashboard/PRTable'
import SettingsDialog from '@/features/dashboard/SettingsDialog'
import { Button } from '@/components/ui/button'
import usePullRequests from '@/hooks/usePullRequests'
import type { PullRequest, Reviewer } from '@/types/github'

function getUniqueReviewers(prs: { requested_reviewers: Reviewer[] }[]): Reviewer[] {
  const all = prs.flatMap((pr) => pr.requested_reviewers)
  return Array.from(new Map(all.map((r) => [r.id, r])).values())
}

function getAllUsernames(prs: PullRequest[]): string[] {
  const set = new Set<string>()
  for (const pr of prs) {
    set.add(pr.user.login)
    for (const r of pr.requested_reviewers) set.add(r.login)
    for (const r of pr.pendingReviewers) set.add(r.login)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
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
  const { data: prs } = usePullRequests()
  const reviewers = prs ? getUniqueReviewers(prs) : []
  const allUsernames = prs ? getAllUsernames(prs) : []
  const [currentUsername, setCurrentUsername] = useState<string | null>(getGitHubUsername)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    fetchMappings()
  }, [])

  return (
    <div className='flex h-screen flex-col bg-background p-4 sm:p-6'>
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
          <ThemeToggle />
          <SettingsDialog
            reviewers={reviewers}
            allUsernames={allUsernames}
            onUsernameChange={setCurrentUsername}
          />
        </div>
      </header>

      <Separator className='my-4 shrink-0' />

      <PRTable currentUsername={currentUsername} resetKey={resetKey} />
    </div>
  )
}

export default App
