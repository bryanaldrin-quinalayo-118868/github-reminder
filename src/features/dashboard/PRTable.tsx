import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Bell, CircleCheck, ExternalLink, RefreshCw, Search, Settings, X } from 'lucide-react'
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
import { timeAgo } from '@/lib/utils'
import usePullRequests from '@/hooks/usePullRequests'
import MergeStatusBadge from '@/components/dashboard/MergeStatusBadge'
import MultiSelect from '@/components/dashboard/MultiSelect'
import NotifyDialog from '@/components/dashboard/NotifyDialog'
import type { NotifyEntry } from '@/components/dashboard/NotifyDialog'
import PrTypeBadge from '@/components/dashboard/PrTypeBadge'
import ReviewerBadge from '@/components/dashboard/ReviewerBadge'
import StaleBadge from '@/components/dashboard/StaleBadge'
import StatsBanner from '@/components/dashboard/StatsBanner'
import type { PrType, PullRequest } from '@/types/github'

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
  const [sprintFilters, setSprintFilters] = useState<Set<string>>(new Set())
  const [reviewerFilters, setReviewerFilters] = useState<Set<string>>(new Set())
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
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

  // Contextually disable filters that are redundant for the active segment
  const isOwnerDisabled = view === 'my-prs'
  const isReviewerDisabled = view === 'review-requests'

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
    if (!isOwnerDisabled && ownerFilters.size > 0 && !ownerFilters.has(pr.user.login)) return false
    if (adoFilters.size > 0 && !pr.adoWorkItems.some((wi) => adoFilters.has(wi.state))) return false
    if (sprintFilters.size > 0 && !pr.adoWorkItems.some((wi) => sprintFilters.has(wi.sprint))) return false
    if (!isReviewerDisabled && reviewerFilters.size > 0 && !pr.pendingReviewers.some((r) => reviewerFilters.has(r.login))) return false
    if (typeFilters.size > 0 && !typeFilters.has(pr.prType)) return false
    if (searchQuery && !pr.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const activeFilterCount =
    (repoFilters.size > 0 ? 1 : 0) +
    (!isOwnerDisabled && ownerFilters.size > 0 ? 1 : 0) +
    (adoFilters.size > 0 ? 1 : 0) +
    (sprintFilters.size > 0 ? 1 : 0) +
    (!isReviewerDisabled && reviewerFilters.size > 0 ? 1 : 0) +
    (typeFilters.size > 0 ? 1 : 0) +
    (idleSort !== 'none' ? 1 : 0)

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
  const allSprints = [...new Set(prs.flatMap((pr) => pr.adoWorkItems.map((wi) => wi.sprint)).filter(Boolean))].sort()
  const allPrTypes: PrType[] = ['Feature', 'Bugfix', 'Misc']
  const allReviewerLogins = [...new Map(
    prs.flatMap((pr) => pr.pendingReviewers).map((r) => [r.login, r]),
  ).values()].sort((a, b) => a.login.localeCompare(b.login)).map((r) => r.login)

  function handleNotifySingle(pr: PullRequest) {
    setNotifyEntries([{
      prTitle: pr.title,
      prUrl: pr.html_url,
      reviewers: pr.pendingReviewers,
      repoName: pr.repoName,
      prNumber: pr.number,
      authorLogin: pr.user.login,
      adoWorkItems: pr.adoWorkItems,
      totalReviewers: pr.pendingReviewers.length,
      mergeableState: pr.mergeableState,
    }])
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

      {/* Search */}
      <div className='relative w-full sm:w-72'>
        <Search className='absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
        <input
          type='text'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Search PR titles…'
          className='h-8 w-full rounded-md border bg-background pl-8 pr-8 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring'
        />
        {searchQuery && (
          <button
            type='button'
            onClick={() => setSearchQuery('')}
            className='absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground'
          >
            <X className='h-3.5 w-3.5' />
          </button>
        )}
      </div>

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
          disabled={isOwnerDisabled}
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
          label='Sprint'
          selected={sprintFilters}
          options={allSprints}
          onChange={setSprintFilters}
          width='w-32 sm:w-44'
        />

        <MultiSelect
          label='Reviewer'
          selected={reviewerFilters}
          options={allReviewerLogins}
          onChange={setReviewerFilters}
          width='w-32 sm:w-44'
          disabled={isReviewerDisabled}
        />

        <MultiSelect
          label='Type'
          selected={typeFilters}
          options={allPrTypes}
          onChange={setTypeFilters}
          width='w-28 sm:w-32'
        />

        {activeFilterCount > 0 && (
          <Badge variant='outline' className='gap-1 text-xs'>
            {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
          </Badge>
        )}

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
                      <PrTypeBadge type={pr.prType} />
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

                <div className='flex flex-wrap items-center gap-1.5'>
                  <MergeStatusBadge state={pr.mergeableState} />
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
                        #{wi.id} · {wi.state}{wi.sprint ? ` · ${wi.sprint}` : ''}
                      </a>
                    )
                  })}
                </div>

                {pr.pendingReviewers.length > 0 ? (
                  <div className='flex flex-wrap gap-1.5'>
                    {pr.pendingReviewers.map((reviewer) => (
                      <ReviewerBadge key={reviewer.id} reviewer={reviewer} />
                    ))}
                  </div>
                ) : (
                  <span className='inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400'>
                    <CircleCheck className='h-3 w-3' />
                    Ready to Merge
                  </span>
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
              <TableHead>Status</TableHead>
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
                      <PrTypeBadge type={pr.prType} />
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
                              <span className='hidden lg:inline'>· {wi.state}{wi.sprint ? ` · ${wi.sprint}` : ''}</span>
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
                      <span className='inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400'>
                        <CircleCheck className='h-3 w-3' />
                        Ready to Merge
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <MergeStatusBadge state={pr.mergeableState} />
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
                <TableCell colSpan={5} className='h-24 text-center text-muted-foreground'>
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

export default function PRTable({ currentUsername, resetKey }: { currentUsername: string | null; resetKey: number }) {
  const { data: prs, isLoading, isRefetching, isError, loadedCount, totalCount, dataUpdatedAt, refetchAll } = usePullRequests()
  const isStillLoading = isLoading && loadedCount < totalCount

  if (isLoading && (!prs || prs.length === 0)) {
    return <PRTableSkeleton />
  }

  if (isError && (!prs || prs.length === 0)) {
    return (
      <div className='flex flex-1 items-center justify-center p-4'>
        <div className='flex w-full max-w-md flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6'>
          <div className='flex items-center gap-2 text-destructive'>
            <AlertTriangle className='h-5 w-5 shrink-0' />
            <p className='font-semibold'>Failed to load pull requests</p>
          </div>
          <p className='text-sm text-muted-foreground'>
            This usually happens when your GitHub token hasn't been authorized for SSO. Make sure you've enabled SSO for the <span className='font-medium text-foreground'>nelnet-nbs</span> organization:
          </p>
          <ol className='list-inside list-decimal space-y-1.5 text-sm text-muted-foreground'>
            <li>
              Go to{' '}
              <a
                href='https://github.com/settings/tokens'
                target='_blank'
                rel='noopener noreferrer'
                className='font-medium text-primary hover:underline'
              >
                GitHub → Settings → Tokens
              </a>
            </li>
            <li>Find your token and click <span className='font-medium text-foreground'>Configure SSO</span></li>
            <li>Click <span className='font-medium text-foreground'>Authorize</span> next to <span className='font-medium text-foreground'>nelnet-nbs</span></li>
          </ol>
          <Button size='sm' variant='outline' className='cursor-pointer gap-1.5 self-start' onClick={() => refetchAll()}>
            <RefreshCw className='h-3.5 w-3.5' />
            Retry
          </Button>
        </div>
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
      key={resetKey}
      prs={prs}
      loadingProgress={isStillLoading ? { loaded: loadedCount, total: totalCount } : undefined}
      dataUpdatedAt={dataUpdatedAt}
      isRefetching={isRefetching}
      onRefresh={refetchAll}
      currentUsername={currentUsername}
    />
  )
}
