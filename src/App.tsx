import { useState } from 'react'
import { GitPullRequest } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import PRTable from '@/features/dashboard/PRTable'
import RepoSelector from '@/features/dashboard/RepoSelector'

function App() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)

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
        <RepoSelector
          value={selectedRepo}
          onChange={setSelectedRepo}
        />
      </header>

      <Separator className='my-4 shrink-0' />

      <PRTable repoName={selectedRepo} />
    </div>
  )
}

export default App
