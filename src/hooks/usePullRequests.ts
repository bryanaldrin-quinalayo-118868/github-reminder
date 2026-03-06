import useAllPullRequests from '@/hooks/useAllPullRequests';

export default function usePullRequests() {
  const query = useAllPullRequests(true);

  return {
    data: query.data.length > 0 ? query.data : undefined,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    loadedCount: query.loadedCount,
    totalCount: query.totalCount,
    dataUpdatedAt: query.dataUpdatedAt,
    refetchAll: query.refetchAll,
  };
}
