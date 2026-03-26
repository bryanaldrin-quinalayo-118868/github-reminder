import type { PrType } from '@/types/github'

const prTypeConfig: Record<PrType, string> = {
  Feature: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  Bugfix: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  Misc: 'bg-muted text-muted-foreground border-border/40',
}

export default function PrTypeBadge({ type }: { type: PrType }) {
  return (
    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${prTypeConfig[type] ?? prTypeConfig.Misc}`}>
      {type}
    </span>
  )
}
