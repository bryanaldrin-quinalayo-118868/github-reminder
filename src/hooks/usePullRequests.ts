import useAllPullRequests from '@/hooks/useAllPullRequests';

export default function usePullRequests() {
  const query = useAllPullRequests(true);

  return {
    data: query.data.length > 0 ? query.data : undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    loadedCount: query.loadedCount,
    totalCount: query.totalCount,
  };
}
