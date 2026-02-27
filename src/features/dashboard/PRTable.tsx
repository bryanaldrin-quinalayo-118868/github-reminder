import { Bell, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getTeamsEmail } from '@/config/user-mappings'
import usePullRequests from '@/hooks/usePullRequests'
import type { PullRequest, Reviewer } from '@/types/github'

type PRTableProps = {
  repoName: string | null;
};

function notifyReviewers(reviewers: Reviewer[]) {
  const mapped = reviewers.map((r) => ({
    login: r.login,
    email: getTeamsEmail(r.login),
  }))

  const withEmail = mapped.filter((m) => m.email)
  const withoutEmail = mapped.filter((m) => !m.email)

  if (withEmail.length > 0) {
    toast.success(
      `Notified: ${withEmail.map((m) => m.login).join(', ')}`,
    )
  }

  if (withoutEmail.length > 0) {
    toast.warning(
      `No Teams email mapped for: ${withoutEmail.map((m) => m.login).join(', ')}`,
    )
  }

  if (mapped.length === 0) {
    toast.info('No reviewers to notify.')
  }
}

function notifyAll(prs: PullRequest[]) {
  const allReviewers = prs.flatMap((pr) => pr.pendingReviewers)
  const unique = Array.from(
    new Map(allReviewers.map((r) => [r.id, r])).values(),
  )
  notifyReviewers(unique)
}

function ReviewerBadge({ reviewer }: { reviewer: Reviewer }) {
  return (
    <div className='flex items-center gap-1.5'>
      <Avatar className='h-6 w-6'>
        <AvatarImage
          src={reviewer.avatar_url}
          alt={reviewer.login}
        />
        <AvatarFallback className='text-[10px]'>
          {reviewer.login.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className='text-xs text-muted-foreground'>
        {reviewer.login}
      </span>
    </div>
  )
}

export default function PRTable({ repoName }: PRTableProps) {
  const { data: prs, isLoading, isError } = usePullRequests(repoName)

  if (!repoName) {
    return (
      <div className='flex flex-1 items-center justify-center text-muted-foreground'>
        Select a repository to view open pull requests.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='flex flex-1 flex-col gap-3 p-4'>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className='h-12 w-full' />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className='flex flex-1 items-center justify-center text-destructive'>
        Failed to load pull requests.
      </div>
    )
  }

  if (!prs || prs.length === 0) {
    return (
      <div className='flex flex-1 items-center justify-center text-muted-foreground'>
        No open pull requests.
      </div>
    )
  }

  return (
    <div className='flex flex-1 flex-col gap-3 overflow-hidden'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Badge variant='secondary' className='tabular-nums'>
            {prs.length} open
          </Badge>
        </div>
        <Button
          size='sm'
          variant='outline'
          className='cursor-pointer gap-1.5'
          onClick={() => notifyAll(prs)}
        >
          <Bell className='h-3.5 w-3.5' />
          Notify All
        </Button>
      </div>

      <ScrollArea className='flex-1 rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='w-[50%]'>PR Title</TableHead>
              <TableHead>Pending Reviewers</TableHead>
              <TableHead className='w-24 text-right'>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prs.map((pr) => (
              <TableRow key={pr.id}>
                <TableCell>
                  <a
                    href={pr.html_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='group flex items-center gap-1.5 font-medium hover:underline'
                  >
                    <span className='line-clamp-1'>{pr.title}</span>
                    <ExternalLink className='h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100' />
                  </a>
                  <span className='text-xs text-muted-foreground'>
                    #{pr.number}
                  </span>
                </TableCell>
                <TableCell>
                  {pr.pendingReviewers.length > 0 ? (
                    <div className='flex flex-wrap gap-2'>
                      {pr.pendingReviewers.map((reviewer) => (
                        <ReviewerBadge
                          key={reviewer.id}
                          reviewer={reviewer}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className='text-xs text-muted-foreground'>
                      All reviewed
                    </span>
                  )}
                </TableCell>
                <TableCell className='text-right'>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='cursor-pointer gap-1.5'
                    onClick={() => notifyReviewers(pr.pendingReviewers)}
                  >
                    <Bell className='h-3.5 w-3.5' />
                    Notify
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
