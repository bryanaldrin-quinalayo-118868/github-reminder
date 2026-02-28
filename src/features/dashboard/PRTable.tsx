import { useRef, useState } from 'react'
import { Bell, ChevronDown, ExternalLink, X } from 'lucide-react'
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
import { getStateColor } from '@/services/ado'
import usePullRequests from '@/hooks/usePullRequests'
import NotifyDialog from '@/features/dashboard/NotifyDialog'
import type { NotifyEntry } from '@/features/dashboard/NotifyDialog'
import type { PullRequest, Reviewer } from '@/types/github'

type PRTableProps = {
  repoName: string | null;
};

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
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [notifyEntries, setNotifyEntries] = useState<NotifyEntry[]>([])

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
      <div className='flex flex-wrap items-center gap-2'>
        <Badge variant='secondary' className='tabular-nums'>
          {filteredPrs.length} of {prs.length} open
        </Badge>

        <MultiSelect
          label='ADO State'
          selected={adoFilters}
          options={adoStates}
          onChange={setAdoFilters}
          width='w-32 sm:w-40'
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
          width='w-32 sm:w-44'
        />

        <Button
          size='sm'
          variant='outline'
          className='ml-auto cursor-pointer gap-1.5'
          onClick={() => {
            const entries: NotifyEntry[] = filteredPrs
              .filter((pr) => pr.pendingReviewers.length > 0)
              .map((pr) => ({ prTitle: pr.title, prUrl: pr.html_url, reviewers: pr.pendingReviewers }))
            if (entries.length > 0) {
              setNotifyEntries(entries)
              setNotifyOpen(true)
            }
          }}
        >
          <Bell className='h-3.5 w-3.5' />
          Notify All
        </Button>
      </div>

      {/* Mobile + Tablet card layout */}
      <div className='min-h-0 flex-1 overflow-auto lg:hidden'>
        {filteredPrs.length > 0 ? (
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            {filteredPrs.map((pr) => (
              <div key={pr.id} className='flex flex-col gap-2 rounded-lg border p-3'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0 flex-1'>
                    <a
                      href={pr.html_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='group flex items-center gap-1 text-sm font-medium hover:underline'
                    >
                      <span className='line-clamp-2'>{pr.title}</span>
                      <ExternalLink className='h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100' />
                    </a>
                    <span className='text-xs text-muted-foreground'>#{pr.number}</span>
                  </div>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='shrink-0 cursor-pointer gap-1'
                    onClick={() => {
                      setNotifyEntries([{ prTitle: pr.title, prUrl: pr.html_url, reviewers: pr.pendingReviewers }])
                      setNotifyOpen(true)
                    }}
                  >
                    <Bell className='h-3.5 w-3.5' />
                  </Button>
                </div>

                {pr.adoWorkItems.length > 0 && (
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
                          #{wi.id} · {wi.state}
                        </a>
                      )
                    })}
                  </div>
                )}

                {pr.pendingReviewers.length > 0 && (
                  <div className='flex flex-wrap gap-1.5'>
                    {pr.pendingReviewers.map((reviewer) => (
                      <ReviewerBadge key={reviewer.id} reviewer={reviewer} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className='flex h-24 items-center justify-center text-sm text-muted-foreground'>
            No results match the current filters.
          </div>
        )}
      </div>

      {/* Desktop table layout */}
      <div className='hidden min-h-0 flex-1 overflow-auto rounded-md border lg:block'>
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
                              <span className='hidden lg:inline'>· {wi.state}</span>
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
                      onClick={() => {
                        setNotifyEntries([{ prTitle: pr.title, prUrl: pr.html_url, reviewers: pr.pendingReviewers }])
                        setNotifyOpen(true)
                      }}
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

      {notifyOpen && (
        <NotifyDialog
          entries={notifyEntries}
          open={notifyOpen}
          onOpenChange={setNotifyOpen}
        />
      )}
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
      <div className='flex flex-1 flex-col gap-3 overflow-hidden'>
        {/* Filter bar skeleton */}
        <div className='flex flex-wrap items-center gap-2'>
          <Skeleton className='h-6 w-24' />
          <Skeleton className='h-8 w-32 sm:w-40' />
          <Skeleton className='h-8 w-32 sm:w-44' />
          <Skeleton className='ml-auto h-8 w-24' />
        </div>

        {/* Mobile + Tablet card skeletons */}
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='flex flex-col gap-2 rounded-lg border p-3'>
              <div className='flex items-start justify-between gap-2'>
                <div className='flex flex-1 flex-col gap-1'>
                  <Skeleton className='h-4 w-3/4' />
                  <Skeleton className='h-3 w-12' />
                </div>
                <Skeleton className='h-8 w-8 shrink-0' />
              </div>
              <div className='flex gap-1'>
                <Skeleton className='h-5 w-20 rounded-full' />
              </div>
              <div className='flex gap-1.5'>
                <Skeleton className='h-6 w-6 rounded-full' />
                <Skeleton className='h-4 w-16' />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table skeletons */}
        <div className='hidden flex-1 rounded-md border lg:block'>
          <div className='flex items-center border-b px-4 py-3'>
            <Skeleton className='h-4 w-[40%]' />
            <Skeleton className='ml-4 h-4 w-20' />
            <Skeleton className='ml-4 h-4 w-32' />
            <Skeleton className='ml-auto h-4 w-16' />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='flex items-center border-b px-4 py-3'>
              <div className='flex w-[40%] flex-col gap-1'>
                <Skeleton className='h-4 w-4/5' />
                <Skeleton className='h-3 w-10' />
              </div>
              <Skeleton className='ml-4 h-5 w-20 rounded-full' />
              <div className='ml-4 flex gap-1.5'>
                <Skeleton className='h-6 w-6 rounded-full' />
                <Skeleton className='h-4 w-16 self-center' />
              </div>
              <Skeleton className='ml-auto h-8 w-16' />
            </div>
          ))}
        </div>
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
