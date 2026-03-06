import { useEffect, useState } from 'react'
import { GitPullRequest, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Separator } from '@/components/ui/separator'
import { fetchMappings } from '@/config/user-mappings'
import PRTable from '@/features/dashboard/PRTable'
import RepoSelector from '@/features/dashboard/RepoSelector'
import SettingsDialog from '@/features/dashboard/SettingsDialog'
import { Button } from '@/components/ui/button'
import usePullRequests from '@/hooks/usePullRequests'
import type { Reviewer } from '@/types/github'

function getUniqueReviewers(prs: { requested_reviewers: Reviewer[] }[]): Reviewer[] {
  const all = prs.flatMap((pr) => pr.requested_reviewers)
  return Array.from(new Map(all.map((r) => [r.id, r])).values())
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
  const [selectedRepo, setSelectedRepo] = useState<string | null>(
    () => localStorage.getItem('gh-reminder:selected-repo'),
  )
  const { data: prs } = usePullRequests(selectedRepo)
  const reviewers = prs ? getUniqueReviewers(prs) : []

  useEffect(() => {
    fetchMappings()
  }, [])

  return (
    <div className='flex h-screen flex-col bg-background p-4 sm:p-6'>
      <header className='flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary'>
              <GitPullRequest className='h-5 w-5 text-primary-foreground' />
            </div>
            <div>
              <h1 className='text-lg font-semibold tracking-tight'>
                PR Reminder
              </h1>
              <p className='text-xs text-muted-foreground'>
                Daycare repositories
              </p>
            </div>
          </div>
          <div className='flex items-center gap-1 sm:hidden'>
            <ThemeToggle />
            <SettingsDialog reviewers={reviewers} />
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <div className='w-full sm:w-72'>
            <RepoSelector
              value={selectedRepo}
              onChange={(repo) => {
                setSelectedRepo(repo)
                localStorage.setItem('gh-reminder:selected-repo', repo)
              }}
            />
          </div>
          <div className='hidden items-center gap-1 sm:flex'>
            <ThemeToggle />
            <SettingsDialog reviewers={reviewers} />
          </div>
        </div>
      </header>

      <Separator className='my-4 shrink-0' />

      <PRTable repoName={selectedRepo} />
    </div>
  )
}

export default App
