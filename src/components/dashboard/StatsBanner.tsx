import { AlertTriangle, Clock, GitPullRequest, Users } from 'lucide-react'
import { daysAgo } from '@/lib/utils'
import type { PullRequest } from '@/types/github'

export default function StatsBanner({ prs }: { prs: PullRequest[] }) {
  const totalOpen = prs.length
  const needsReview = prs.filter((pr) => pr.pendingReviewers.length > 0).length
  const staleCount = prs.filter((pr) => daysAgo(pr.updated_at) >= 3).length
  const criticalCount = prs.filter((pr) => daysAgo(pr.updated_at) >= 7).length

  const idleDays = prs.map((pr) => daysAgo(pr.updated_at))
  const avgIdle = totalOpen > 0 ? (idleDays.reduce((a, b) => a + b, 0) / totalOpen).toFixed(1) : '0'

  const healthColor = criticalCount > 0
    ? 'text-red-600 dark:text-red-400'
    : staleCount > 0
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400'

  return (
    <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
      <div className='flex items-center gap-2.5 rounded-lg border px-3 py-2'>
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10'>
          <GitPullRequest className='h-4 w-4 text-primary' />
        </div>
        <div>
          <p className='text-lg font-semibold leading-none'>{totalOpen}</p>
          <p className='text-[11px] text-muted-foreground'>Open PRs</p>
        </div>
      </div>

      <div className='flex items-center gap-2.5 rounded-lg border px-3 py-2'>
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10'>
          <Users className='h-4 w-4 text-blue-600 dark:text-blue-400' />
        </div>
        <div>
          <p className='text-lg font-semibold leading-none'>{needsReview}</p>
          <p className='text-[11px] text-muted-foreground'>Needs Review</p>
        </div>
      </div>

      <div className='flex items-center gap-2.5 rounded-lg border px-3 py-2'>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${criticalCount > 0 ? 'bg-red-500/10' : staleCount > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
          <AlertTriangle className={`h-4 w-4 ${healthColor}`} />
        </div>
        <div>
          <p className={`text-lg font-semibold leading-none ${healthColor}`}>{staleCount}</p>
          <p className='text-[11px] text-muted-foreground'>Stale ({criticalCount} critical)</p>
        </div>
      </div>

      <div className='flex items-center gap-2.5 rounded-lg border px-3 py-2'>
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted'>
          <Clock className='h-4 w-4 text-muted-foreground' />
        </div>
        <div>
          <p className='text-lg font-semibold leading-none'>{avgIdle}d</p>
          <p className='text-[11px] text-muted-foreground'>Avg Idle Time</p>
        </div>
      </div>
    </div>
  )
}
