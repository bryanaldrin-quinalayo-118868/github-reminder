import { useQuery } from '@tanstack/react-query';
import { fetchOpenPullRequests } from '@/services/github';

export default function usePullRequests(repoName: string | null) {
  return useQuery({
    queryKey: ['pullRequests', repoName],
    queryFn: () => fetchOpenPullRequests(repoName!),
    enabled: !!repoName,
    staleTime: 2 * 60 * 1000,
  });
}
