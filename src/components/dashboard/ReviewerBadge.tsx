import { CircleCheck, MessageSquare, ShieldAlert } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { PendingReviewer, ReviewStatus } from '@/types/github'

const statusConfig: Record<
  ReviewStatus,
  { badge: { bg: string; icon: typeof MessageSquare } | null; text: string; tooltip: string }
> = {
  'pending': { badge: null, text: 'text-muted-foreground', tooltip: 'Pending review' },
  'commented': {
    badge: { bg: 'bg-blue-500', icon: MessageSquare },
    text: 'text-blue-600 dark:text-blue-400',
    tooltip: 'Commented — no unresolved threads',
  },
  'commented-unresolved': {
    badge: { bg: 'bg-amber-500', icon: MessageSquare },
    text: 'text-amber-600 dark:text-amber-400',
    tooltip: 'Commented — has unresolved threads',
  },
  'changes-requested': {
    badge: { bg: 'bg-red-500', icon: ShieldAlert },
    text: 'text-red-600 dark:text-red-400',
    tooltip: 'Requested changes',
  },
  'approved': {
    badge: { bg: 'bg-green-500', icon: CircleCheck },
    text: 'text-green-600 dark:text-green-400',
    tooltip: 'Approved',
  },
  'approved-unresolved': {
    badge: { bg: 'bg-amber-500', icon: CircleCheck },
    text: 'text-amber-600 dark:text-amber-400',
    tooltip: 'Approved — has unresolved threads',
  },
};

export default function ReviewerBadge({ reviewer }: { reviewer: PendingReviewer }) {
  const config = statusConfig[reviewer.reviewStatus];
  const BadgeIcon = config.badge?.icon ?? null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className='flex items-center gap-1.5 cursor-default'>
          <div className='relative'>
            <Avatar className='h-6 w-6'>
              <AvatarImage src={reviewer.avatar_url} alt={reviewer.login} />
              <AvatarFallback className='text-[10px]'>
                {reviewer.login.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {BadgeIcon && (
              <div className={`absolute -right-1 -bottom-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ${config.badge!.bg} ring-1 ring-background`}>
                <BadgeIcon className='h-2 w-2 text-white' />
              </div>
            )}
          </div>
          <span className={`text-xs ${config.text}`}>
            {reviewer.login.split('-')[0]}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side='top' className='text-xs'>
        <p>{reviewer.login}</p>
        <p className='text-muted-foreground'>{config.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}
