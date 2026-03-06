import { useQueries } from '@tanstack/react-query'
import { fetchOpenPullRequests } from '@/services/github'
import useRepos from '@/hooks/useRepos'
import type { PullRequest } from '@/types/github'

export default function useAllPullRequests(enabled: boolean) {
  const { data: repos, isLoading: reposLoading } = useRepos()

  const queries = useQueries({
    queries: (repos ?? []).map((repo) => ({
      queryKey: ['pullRequests', repo.name] as const,
      queryFn: () => fetchOpenPullRequests(repo.name),
      enabled,
      staleTime: 2 * 60 * 1000,
    })),
  })

  const isLoading = reposLoading || queries.some((q) => q.isLoading)
  const isError = !reposLoading && queries.every((q) => q.isError) && queries.length > 0
  const loadedCount = queries.filter((q) => q.isSuccess).length
  const totalCount = queries.length

  const data: PullRequest[] = queries
    .flatMap((q) => q.data ?? [])

  return { data, isLoading, isError, loadedCount, totalCount }
}
