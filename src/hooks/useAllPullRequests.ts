import { useQueries } from '@tanstack/react-query'
import { fetchOpenPullRequests } from '@/services/github'
import useRepos from '@/hooks/useRepos'
import type { PullRequest } from '@/types/github'

const REFETCH_INTERVAL = 5 * 60 * 1000 // 5 minutes

export default function useAllPullRequests(enabled: boolean) {
  const { data: repos, isLoading: reposLoading } = useRepos()

  const queries = useQueries({
    queries: (repos ?? []).map((repo) => ({
      queryKey: ['pullRequests', repo.name] as const,
      queryFn: () => fetchOpenPullRequests(repo.name),
      enabled,
      staleTime: 2 * 60 * 1000,
      refetchInterval: REFETCH_INTERVAL,
    })),
  })

  const isLoading = reposLoading || queries.some((q) => q.isLoading)
  const isRefetching = queries.some((q) => q.isRefetching)
  const isError = !reposLoading && queries.every((q) => q.isError) && queries.length > 0
  const loadedCount = queries.filter((q) => q.isSuccess).length
  const totalCount = queries.length

  // Oldest dataUpdatedAt among successful queries — represents when the "full" dataset was last fresh
  const dataUpdatedAt = queries.length > 0
    ? Math.min(...queries.filter((q) => q.isSuccess).map((q) => q.dataUpdatedAt))
    : 0

  const data: PullRequest[] = queries
    .flatMap((q) => q.data ?? [])

  function refetchAll() {
    queries.forEach((q) => q.refetch())
  }

  return { data, isLoading, isRefetching, isError, loadedCount, totalCount, dataUpdatedAt, refetchAll }
}
