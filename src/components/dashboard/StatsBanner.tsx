import { AlertTriangle, Clock, GitPullRequest, Users } from 'lucide-react'
import { cn, daysAgo } from '@/lib/utils'
import type { PullRequest } from '@/types/github'

type StatCardProps = {
  icon: typeof GitPullRequest;
  iconClassName: string;
  bgClassName: string;
  value: string | number;
  valueClassName?: string;
  label: string;
  accent?: boolean;
};

function StatCard({ icon: Icon, iconClassName, bgClassName, value, valueClassName, label, accent }: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-2.5 transition-all duration-200 hover:shadow-md',
        accent ? 'gradient-border glow' : 'border-border/60 hover:border-border',
      )}
    >
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105', bgClassName)}>
        <Icon className={cn('h-4.5 w-4.5', iconClassName)} />
      </div>
      <div className='min-w-0'>
        <p className={cn('text-xl font-bold leading-none tracking-tight animate-count-up', valueClassName)}>
          {value}
        </p>
        <p className='mt-0.5 text-[11px] font-medium text-muted-foreground'>{label}</p>
      </div>
    </div>
  )
}

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

  const healthBg = criticalCount > 0
    ? 'bg-red-500/10'
    : staleCount > 0
      ? 'bg-amber-500/10'
      : 'bg-emerald-500/10'

  const healthIcon = criticalCount > 0
    ? 'text-red-600 dark:text-red-400'
    : staleCount > 0
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400'

  return (
    <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-4'>
      <StatCard
        icon={GitPullRequest}
        iconClassName='text-primary'
        bgClassName='bg-primary/10'
        value={totalOpen}
        label='Open PRs'
      />
      <StatCard
        icon={Users}
        iconClassName='text-blue-600 dark:text-blue-400'
        bgClassName='bg-blue-500/10'
        value={needsReview}
        label='Needs Review'
      />
      <StatCard
        icon={AlertTriangle}
        iconClassName={healthIcon}
        bgClassName={healthBg}
        value={staleCount}
        valueClassName={healthColor}
        label={`Stale (${criticalCount} critical)`}
        accent={criticalCount > 0}
      />
      <StatCard
        icon={Clock}
        iconClassName='text-muted-foreground'
        bgClassName='bg-muted'
        value={`${avgIdle}d`}
        label='Avg Idle Time'
      />
    </div>
  )
}
