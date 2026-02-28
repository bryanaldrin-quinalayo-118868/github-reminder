import { useRef, useState } from 'react'
import { Bell, ChevronDown, ExternalLink, X } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { msalInstance } from '@/config/msal'
import { getTeamsSettings } from '@/config/teams-settings'
import { getTeamsEmail } from '@/config/user-mappings'
import { getStateColor } from '@/services/ado'
import { sendChannelMessage, sendChatMessage } from '@/services/graph'
import usePullRequests from '@/hooks/usePullRequests'
import type { PullRequest, Reviewer } from '@/types/github'

type PRTableProps = {
  repoName: string | null;
};

async function notifyReviewers(
  reviewers: Reviewer[],
  prTitle: string,
  prUrl: string,
): Promise<void> {
  const mapped = reviewers.map((r) => ({
    login: r.login,
    email: getTeamsEmail(r.login),
  }))

  const withEmail = mapped.filter((m) => m.email)
  const withoutEmail = mapped.filter((m) => !m.email)

  if (withoutEmail.length > 0) {
    toast.warning(
      `No Teams email mapped for: ${withoutEmail.map((m) => m.login).join(', ')}`,
    )
  }

  if (mapped.length === 0) {
    toast.info('No reviewers to notify.')
    return
  }

  if (withEmail.length === 0) return

  const isSignedIn = msalInstance.getAllAccounts().length > 0
  const settings = getTeamsSettings()

  const isChannelReady = settings.sendMode === 'channel' && settings.teamId && settings.channelId
  const isChatReady = settings.sendMode === 'chat' && settings.chatId

  if (!isSignedIn || (!isChannelReady && !isChatReady)) {
    toast.warning('Teams not configured. Go to Settings to sign in and select a destination.')
    return
  }

  const reviewerPayload = withEmail.map((m) => ({ email: m.email!, displayName: m.login }))

  try {
    if (settings.sendMode === 'chat' && settings.chatId) {
      await sendChatMessage(settings.chatId, prTitle, prUrl, reviewerPayload)
    } else if (settings.teamId && settings.channelId) {
      await sendChannelMessage(settings.teamId, settings.channelId, prTitle, prUrl, reviewerPayload)
    }
    toast.success(`Notified: ${withEmail.map((m) => m.login).join(', ')}`)
  } catch (err) {
    toast.error(`Failed to send Teams message: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function notifyAllReviewers(prs: PullRequest[]): Promise<void> {
  const isSignedIn = msalInstance.getAllAccounts().length > 0
  const settings = getTeamsSettings()

  const isChannelReady = settings.sendMode === 'channel' && settings.teamId && settings.channelId
  const isChatReady = settings.sendMode === 'chat' && settings.chatId

  if (!isSignedIn || (!isChannelReady && !isChatReady)) {
    toast.warning('Teams not configured. Go to Settings to sign in and select a destination.')
    return
  }

  for (const pr of prs) {
    if (pr.pendingReviewers.length > 0) {
      await notifyReviewers(pr.pendingReviewers, pr.title, pr.html_url)
    }
  }
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

type MultiSelectProps = {
  label: string;
  selected: Set<string>;
  options: string[];
  onChange: (next: Set<string>) => void;
  renderOption?: (value: string) => React.ReactNode;
  width?: string;
};

function MultiSelect({ label, selected, options, onChange, renderOption, width = 'w-40' }: MultiSelectProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  function toggle(value: string) {
    const next = new Set(selected)
    if (next.has(value)) {
      next.delete(value)
    } else {
      next.add(value)
    }
    onChange(next)
  }

  function clear() {
    onChange(new Set())
    if (detailsRef.current) detailsRef.current.open = false
  }

  return (
    <details ref={detailsRef} className='relative'>
      <summary
        className={`flex h-8 ${width} cursor-pointer items-center justify-between rounded-md border bg-background px-2 text-xs outline-none list-none`}
      >
        <span className='truncate'>
          {selected.size === 0 ? label : `${label} (${selected.size})`}
        </span>
        <ChevronDown className='h-3 w-3 shrink-0 text-muted-foreground' />
      </summary>
      <div className='absolute left-0 top-9 z-50 min-w-full rounded-md border bg-popover p-1 shadow-md'>
        {selected.size > 0 && (
          <button
            type='button'
            onClick={clear}
            className='mb-1 flex w-full items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent'
          >
            <X className='h-3 w-3' />
            Clear
          </button>
        )}
        {options.map((opt) => (
          <label
            key={opt}
            className='flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent'
          >
            <input
              type='checkbox'
              checked={selected.has(opt)}
              onChange={() => toggle(opt)}
              className='accent-primary'
            />
            {renderOption ? renderOption(opt) : opt}
          </label>
        ))}
      </div>
    </details>
  )
}

function PRDataTable({ prs }: { prs: PullRequest[] }) {
  const [adoFilters, setAdoFilters] = useState<Set<string>>(new Set())
  const [reviewerFilters, setReviewerFilters] = useState<Set<string>>(new Set())

  const filteredPrs = prs.filter((pr) => {
    if (adoFilters.size > 0 && !pr.adoWorkItems.some((wi) => adoFilters.has(wi.state))) return false
    if (reviewerFilters.size > 0 && !pr.pendingReviewers.some((r) => reviewerFilters.has(r.login))) return false
    return true
  })

  // Collect unique ADO states and reviewers for filter dropdowns (from all PRs, not filtered)
  const adoStates = [...new Set(prs.flatMap((pr) => pr.adoWorkItems.map((wi) => wi.state)))].sort()
  const allReviewerLogins = [...new Map(
    prs.flatMap((pr) => pr.pendingReviewers).map((r) => [r.login, r]),
  ).values()].sort((a, b) => a.login.localeCompare(b.login)).map((r) => r.login)

  return (
    <div className='flex flex-1 flex-col gap-3 overflow-hidden'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Badge variant='secondary' className='tabular-nums'>
            {filteredPrs.length} of {prs.length} open
          </Badge>

          <MultiSelect
            label='ADO State'
            selected={adoFilters}
            options={adoStates}
            onChange={setAdoFilters}
            width='w-40'
            renderOption={(state) => {
              const color = getStateColor(state)
              return <span className={color.text}>{state}</span>
            }}
          />

          <MultiSelect
            label='Reviewer'
            selected={reviewerFilters}
            options={allReviewerLogins}
            onChange={setReviewerFilters}
            width='w-44'
          />
        </div>

        <Button
          size='sm'
          variant='outline'
          className='cursor-pointer gap-1.5'
          onClick={() => notifyAllReviewers(filteredPrs)}
        >
          <Bell className='h-3.5 w-3.5' />
          Notify All
        </Button>
      </div>

      <div className='min-h-0 flex-1 overflow-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='w-[40%]'>PR Title</TableHead>
              <TableHead>Work Item</TableHead>
              <TableHead>Pending Reviewers</TableHead>
              <TableHead className='w-24 text-right'>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPrs.length > 0 ? (
              filteredPrs.map((pr) => (
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
                    <span className='text-xs text-muted-foreground'>#{pr.number}</span>
                  </TableCell>
                  <TableCell>
                    {pr.adoWorkItems.length > 0 ? (
                      <div className='flex flex-wrap gap-1'>
                        {pr.adoWorkItems.map((wi) => {
                          const color = getStateColor(wi.state)
                          return (
                            <a
                              key={wi.id}
                              href={wi.url}
                              target='_blank'
                              rel='noopener noreferrer'
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${color.bg} ${color.text} hover:opacity-80 transition-opacity`}
                            >
                              #{wi.id}
                              <span className='hidden sm:inline'>· {wi.state}</span>
                            </a>
                          )
                        })}
                      </div>
                    ) : (
                      <span className='text-xs text-muted-foreground'>—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {pr.pendingReviewers.length > 0 ? (
                      <div className='flex flex-wrap gap-2'>
                        {pr.pendingReviewers.map((reviewer) => (
                          <ReviewerBadge key={reviewer.id} reviewer={reviewer} />
                        ))}
                      </div>
                    ) : (
                      <span className='text-xs text-muted-foreground'>All reviewed</span>
                    )}
                  </TableCell>
                  <TableCell className='text-right'>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='cursor-pointer gap-1.5'
                      onClick={() => notifyReviewers(pr.pendingReviewers, pr.title, pr.html_url)}
                    >
                      <Bell className='h-3.5 w-3.5' />
                      Notify
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className='h-24 text-center text-muted-foreground'>
                  No results match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
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

  return <PRDataTable prs={prs} />
}
