import { Ban, CheckCircle2, CircleDashed, CircleDot, GitMerge, ShieldAlert, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

const statusMap: Record<string, { icon: typeof CheckCircle2; label: string; className: string }> = {
  clean:    { icon: CheckCircle2,   label: 'Ready',    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
  blocked:  { icon: Ban,            label: 'Blocked',  className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  behind:   { icon: GitMerge,       label: 'Behind',   className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  dirty:    { icon: TriangleAlert,   label: 'Conflicts', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  unstable: { icon: ShieldAlert,    label: 'Unstable', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  draft:    { icon: CircleDashed,   label: 'Draft',    className: 'bg-muted text-muted-foreground border-border/40' },
  unknown:  { icon: CircleDot,      label: 'Unknown',  className: 'bg-muted text-muted-foreground border-border/40' },
}

export default function MergeStatusBadge({ state }: { state: string }) {
  const s = statusMap[state] ?? statusMap.unknown
  const Icon = s.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide', s.className)}>
      <Icon className='h-3 w-3' />
      {s.label}
    </span>
  )
}
