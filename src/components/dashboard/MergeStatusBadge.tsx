import { Ban, CircleCheck, Clock, GitMerge, Loader2, TriangleAlert } from 'lucide-react'

const mergeStateConfig: Record<string, { icon: typeof CircleCheck; label: string; className: string }> = {
  clean: { icon: GitMerge, label: 'Ready', className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  blocked: { icon: Ban, label: 'Blocked', className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  behind: { icon: TriangleAlert, label: 'Behind', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  dirty: { icon: TriangleAlert, label: 'Conflicts', className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  unstable: { icon: TriangleAlert, label: 'Unstable', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  draft: { icon: Clock, label: 'Draft', className: 'bg-muted text-muted-foreground' },
  unknown: { icon: Loader2, label: 'Pending', className: 'bg-muted text-muted-foreground' },
}

export default function MergeStatusBadge({ state }: { state: string }) {
  const config = mergeStateConfig[state] ?? mergeStateConfig.unknown
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      <Icon className={`h-3 w-3 ${state === 'unknown' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  )
}
