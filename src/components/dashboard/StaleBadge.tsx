import { Clock } from 'lucide-react'
import { daysAgo } from '@/lib/utils'

export default function StaleBadge({ updatedAt }: { updatedAt: string }) {
  const days = daysAgo(updatedAt)
  if (days < 3) return null

  const label = days === 1 ? '1 day' : `${days}d`
  const color =
    days >= 7
      ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'

  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${color}`}>
      <Clock className='h-2.5 w-2.5' />
      {label} idle
    </span>
  )
}
