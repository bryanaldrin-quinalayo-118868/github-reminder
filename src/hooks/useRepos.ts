import { useQuery } from '@tanstack/react-query';
import { fetchDaycareRepos } from '@/services/github';

export default function useRepos() {
  return useQuery({
    queryKey: ['repos', 'daycare'],
    queryFn: fetchDaycareRepos,
    staleTime: 5 * 60 * 1000,
  });
}
