import type { PrType } from '@/types/github'

const prTypeConfig: Record<PrType, string> = {
  Feature: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  Bugfix: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  Misc: 'bg-muted text-muted-foreground',
}

export default function PrTypeBadge({ type }: { type: PrType }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${prTypeConfig[type] ?? prTypeConfig.Misc}`}>
      {type}
    </span>
  )
}
