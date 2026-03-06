import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Bell, ChevronDown, Clock, ExternalLink, GitPullRequest, RefreshCw, Settings, Users, X } from 'lucide-react'
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

// ---------------------------------------------------------------------------
// Helpers & sub-components
// ---------------------------------------------------------------------------

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function timeAgo(timestamp: number): string {
  if (timestamp <= 0) return ''
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function StaleBadge({ updatedAt }: { updatedAt: string }) {
  const days = daysAgo(updatedAt)
  if (days < 3) return null

  const label = days === 1 ? '1 day' : `${days}d`
  const color =
    days >= 7
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'

  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
      <Clock className='h-2.5 w-2.5' />
      {label} idle
    </span>
  )
}

function StatsBanner({ prs }: { prs: PullRequest[] }) {
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

  return (
    <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
      <div className='flex items-center gap-2.5 rounded-lg border px-3 py-2'>
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10'>
          <GitPullRequest className='h-4 w-4 text-primary' />
        </div>
        <div>
          <p className='text-lg font-semibold leading-none'>{totalOpen}</p>
          <p className='text-[11px] text-muted-foreground'>Open PRs</p>
        </div>
      </div>

      <div className='flex items-center gap-2.5 rounded-lg border px-3 py-2'>
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10'>
          <Users className='h-4 w-4 text-blue-600 dark:text-blue-400' />
        </div>
        <div>
          <p className='text-lg font-semibold leading-none'>{needsReview}</p>
          <p className='text-[11px] text-muted-foreground'>Needs Review</p>
        </div>
      </div>

      <div className='flex items-center gap-2.5 rounded-lg border px-3 py-2'>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${criticalCount > 0 ? 'bg-red-500/10' : staleCount > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
          <AlertTriangle className={`h-4 w-4 ${healthColor}`} />
        </div>
        <div>
          <p className={`text-lg font-semibold leading-none ${healthColor}`}>{staleCount}</p>
          <p className='text-[11px] text-muted-foreground'>Stale ({criticalCount} critical)</p>
        </div>
      </div>

      <div className='flex items-center gap-2.5 rounded-lg border px-3 py-2'>
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted'>
          <Clock className='h-4 w-4 text-muted-foreground' />
        </div>
        <div>
          <p className='text-lg font-semibold leading-none'>{avgIdle}d</p>
          <p className='text-[11px] text-muted-foreground'>Avg Idle Time</p>
        </div>
      </div>
    </div>
  )
}

function ReviewerBadge({ reviewer }: { reviewer: Reviewer }) {
  return (
    <div className='flex items-center gap-1.5'>
      <Avatar className='h-6 w-6'>
        <AvatarImage src={reviewer.avatar_url} alt={reviewer.login} />
        <AvatarFallback className='text-[10px]'>
          {reviewer.login.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className='text-xs text-muted-foreground'>{reviewer.login}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MultiSelect
// ---------------------------------------------------------------------------

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
    if (next.has(value)) next.delete(value)
    else next.add(value)
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

// ---------------------------------------------------------------------------
// PRDataTable — manual filter/sort
// ---------------------------------------------------------------------------

type ViewSegment = 'needs-review' | 'my-prs' | 'review-requests' | 'all';

function PRDataTable({ prs, loadingProgress, dataUpdatedAt, isRefetching, onRefresh, currentUsername }: {
  prs: PullRequest[];
  loadingProgress?: { loaded: number; total: number };
  dataUpdatedAt: number;
  isRefetching: boolean;
  onRefresh: () => void;
  currentUsername: string | null;
}) {
  const [view, setView] = useState<ViewSegment>('needs-review')
  const [repoFilters, setRepoFilters] = useState<Set<string>>(new Set())
  const [ownerFilters, setOwnerFilters] = useState<Set<string>>(new Set())
  const [adoFilters, setAdoFilters] = useState<Set<string>>(new Set())
  const [reviewerFilters, setReviewerFilters] = useState<Set<string>>(new Set())
  const [idleSort, setIdleSort] = useState<'none' | 'asc' | 'desc'>('none')
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [notifyEntries, setNotifyEntries] = useState<NotifyEntry[]>([])
  const [showIdentityPrompt, setShowIdentityPrompt] = useState(false)

  const requiresUsername = (seg: ViewSegment) => seg === 'my-prs' || seg === 'review-requests'

  function handleViewChange(seg: ViewSegment) {
    if (requiresUsername(seg) && !currentUsername) {
      setShowIdentityPrompt(true)
      return
    }
    setShowIdentityPrompt(false)
    setView(seg)
  }

  // Tick every 30s so the "Updated X ago" label stays fresh
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Segment counts (computed from all PRs, before other filters)
  const needsReviewCount = prs.filter((pr) => pr.pendingReviewers.length > 0).length
  const myPrsCount = currentUsername ? prs.filter((pr) => pr.user.login === currentUsername).length : 0
  const reviewRequestsCount = currentUsername ? prs.filter((pr) => pr.pendingReviewers.some((r) => r.login === currentUsername)).length : 0

  // Apply segment filter first, then user filters
  const viewPrs = (() => {
    switch (view) {
      case 'needs-review': return prs.filter((pr) => pr.pendingReviewers.length > 0)
      case 'my-prs': return currentUsername ? prs.filter((pr) => pr.user.login === currentUsername) : prs
      case 'review-requests': return currentUsername ? prs.filter((pr) => pr.pendingReviewers.some((r) => r.login === currentUsername)) : prs
      case 'all': return prs
    }
  })()

  const filteredPrs = viewPrs.filter((pr) => {
    if (repoFilters.size > 0 && !repoFilters.has(pr.repoName)) return false
    if (ownerFilters.size > 0 && !ownerFilters.has(pr.user.login)) return false
    if (adoFilters.size > 0 && !pr.adoWorkItems.some((wi) => adoFilters.has(wi.state))) return false
    if (reviewerFilters.size > 0 && !pr.pendingReviewers.some((r) => reviewerFilters.has(r.login))) return false
    return true
  })

  const sortedPrs = idleSort === 'none'
    ? filteredPrs
    : [...filteredPrs].sort((a, b) => {
        const diff = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        return idleSort === 'asc' ? diff : -diff
      })

  // Collect unique values for filter dropdowns (from ALL data, not filtered)
  const allRepos = [...new Set(prs.map((pr) => pr.repoName))].sort()
  const allOwners = [...new Set(prs.map((pr) => pr.user.login))].sort()
  const adoStates = [...new Set(prs.flatMap((pr) => pr.adoWorkItems.map((wi) => wi.state)))].sort()
  const allReviewerLogins = [...new Map(
    prs.flatMap((pr) => pr.pendingReviewers).map((r) => [r.login, r]),
  ).values()].sort((a, b) => a.login.localeCompare(b.login)).map((r) => r.login)

  function handleNotifySingle(pr: PullRequest) {
    setNotifyEntries([{ prTitle: pr.title, prUrl: pr.html_url, reviewers: pr.pendingReviewers }])
    setNotifyOpen(true)
  }


  return (
    <div className='flex flex-1 flex-col gap-3 overflow-hidden'>
      <StatsBanner prs={prs} />

      {/* Segment tabs */}
      <div className='flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 self-start max-w-full'>
        {([
          { key: 'needs-review' as ViewSegment, label: 'Needs Review', shortLabel: 'Review', count: needsReviewCount },
          { key: 'my-prs' as ViewSegment, label: 'My PRs', shortLabel: 'Mine', count: currentUsername ? myPrsCount : null },
          { key: 'review-requests' as ViewSegment, label: 'Review Requests', shortLabel: 'Requests', count: currentUsername ? reviewRequestsCount : null },
          { key: 'all' as ViewSegment, label: 'All PRs', shortLabel: 'All', count: prs.length },
        ]).map((seg) => (
          <button
            key={seg.key}
            type='button'
            onClick={() => handleViewChange(seg.key)}
            className={`shrink-0 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
              view === seg.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className='sm:hidden'>{seg.shortLabel}</span>
            <span className='hidden sm:inline'>{seg.label}</span>
            {seg.count != null && (
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:ml-1.5 ${
                view === seg.key
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted-foreground/10'
              }`}>
                {seg.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {showIdentityPrompt && (
        <div className='flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300'>
          <Settings className='h-4 w-4 shrink-0' />
          <span>
            Set your GitHub username in <strong>Settings</strong> (gear icon, top-right) to use this filter.
          </span>
          <button
            type='button'
            onClick={() => setShowIdentityPrompt(false)}
            className='ml-auto shrink-0 rounded p-0.5 hover:bg-amber-200/50 dark:hover:bg-amber-800/50'
          >
            <X className='h-3.5 w-3.5' />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className='flex flex-wrap items-center gap-2'>
        {loadingProgress && (
          <Badge variant='secondary' className='tabular-nums'>
            {loadingProgress.loaded}/{loadingProgress.total} repos
          </Badge>
        )}

        <MultiSelect
          label='Repo'
          selected={repoFilters}
          options={allRepos}
          onChange={setRepoFilters}
          width='w-32 sm:w-44'
        />

        <MultiSelect
          label='Owner'
          selected={ownerFilters}
          options={allOwners}
          onChange={setOwnerFilters}
          width='w-32 sm:w-40'
        />

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
          variant={idleSort !== 'none' ? 'secondary' : 'outline'}
          className='cursor-pointer gap-1.5'
          onClick={() => setIdleSort((v) => v === 'none' ? 'asc' : v === 'asc' ? 'desc' : 'none')}
        >
          {idleSort === 'asc' ? <ArrowUp className='h-3.5 w-3.5' /> : idleSort === 'desc' ? <ArrowDown className='h-3.5 w-3.5' /> : <ArrowUpDown className='h-3.5 w-3.5' />}
          {idleSort === 'asc' ? 'Most Idle' : idleSort === 'desc' ? 'Least Idle' : 'Idle Sort'}
        </Button>

        <div className='ml-auto flex items-center gap-2'>
          {dataUpdatedAt > 0 && (
            <span className='text-xs text-muted-foreground'>
              Updated {timeAgo(dataUpdatedAt)}
            </span>
          )}
          <Button
            size='sm'
            variant='ghost'
            className='cursor-pointer gap-1.5'
            onClick={onRefresh}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Mobile + Tablet card layout */}
      <div className='min-h-0 flex-1 overflow-auto lg:hidden'>
        {sortedPrs.length > 0 ? (
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            {sortedPrs.map((pr) => (
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
                    <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
                      <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium'>
                        {pr.repoName}
                      </span>
                      <span>#{pr.number}</span>
                      <span>·</span>
                      <span>{pr.user.login}</span>
                      <StaleBadge updatedAt={pr.updated_at} />
                    </div>
                  </div>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='shrink-0 cursor-pointer gap-1'
                    onClick={() => handleNotifySingle(pr)}
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
            {sortedPrs.length > 0 ? (
              sortedPrs.map((pr) => (
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
                    <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                      <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium'>
                        {pr.repoName}
                      </span>
                      <span>#{pr.number}</span>
                      <span>·</span>
                      <span>{pr.user.login}</span>
                      <StaleBadge updatedAt={pr.updated_at} />
                    </div>
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
                      onClick={() => handleNotifySingle(pr)}
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

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PRTableSkeleton() {
  return (
    <div className='flex flex-1 flex-col gap-3 overflow-hidden'>
      <div className='flex flex-wrap items-center gap-2'>
        <Skeleton className='h-6 w-24' />
        <Skeleton className='h-8 w-32 sm:w-40' />
        <Skeleton className='h-8 w-32 sm:w-44' />
        <Skeleton className='ml-auto h-8 w-24' />
      </div>

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

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export default function PRTable({ currentUsername }: { currentUsername: string | null }) {
  const { data: prs, isLoading, isRefetching, isError, loadedCount, totalCount, dataUpdatedAt, refetchAll } = usePullRequests()
  const isStillLoading = isLoading && loadedCount < totalCount

  if (isLoading && (!prs || prs.length === 0)) {
    return <PRTableSkeleton />
  }

  if (isError && (!prs || prs.length === 0)) {
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
    <PRDataTable
      prs={prs}
      loadingProgress={isStillLoading ? { loaded: loadedCount, total: totalCount } : undefined}
      dataUpdatedAt={dataUpdatedAt}
      isRefetching={isRefetching}
      onRefresh={refetchAll}
      currentUsername={currentUsername}
    />
  )
}
