import { useState } from 'react'
import { GitPullRequest } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import PRTable from '@/features/dashboard/PRTable'
import RepoSelector from '@/features/dashboard/RepoSelector'
import SettingsDialog from '@/features/dashboard/SettingsDialog'
import usePullRequests from '@/hooks/usePullRequests'
import type { Reviewer } from '@/types/github'

function getUniqueReviewers(prs: { requested_reviewers: Reviewer[] }[]): Reviewer[] {
  const all = prs.flatMap((pr) => pr.requested_reviewers)
  return Array.from(new Map(all.map((r) => [r.id, r])).values())
}

function App() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const { data: prs } = usePullRequests(selectedRepo)
  const reviewers = prs ? getUniqueReviewers(prs) : []

  return (
    <div className='flex h-screen flex-col bg-background p-6'>
      <header className='flex shrink-0 items-center justify-between'>
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
        <div className='flex items-center gap-2'>
          <RepoSelector
            value={selectedRepo}
            onChange={setSelectedRepo}
          />
          <SettingsDialog reviewers={reviewers} />
        </div>
      </header>

      <Separator className='my-4 shrink-0' />

      <PRTable repoName={selectedRepo} />
    </div>
  )
}

export default App
