import { GitBranch } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import useRepos from '@/hooks/useRepos'

type RepoSelectorProps = {
  value: string | null;
  onChange: (value: string) => void;
};

export default function RepoSelector({ value, onChange }: RepoSelectorProps) {
  const { data: repos, isLoading, isError } = useRepos()

  if (isLoading) {
    return <Skeleton className='h-9 w-72' />
  }

  if (isError) {
    return (
      <p className='text-sm text-destructive'>
        Failed to load repositories.
      </p>
    )
  }

  return (
    <Select
      value={value ?? undefined}
      onValueChange={onChange}
    >
      <SelectTrigger className='w-72 cursor-pointer'>
        <div className='flex items-center gap-2'>
          <GitBranch className='h-4 w-4 text-muted-foreground' />
          <SelectValue placeholder='Select a repository' />
        </div>
      </SelectTrigger>
      <SelectContent>
        {repos?.map((repo) => (
          <SelectItem
            key={repo.id}
            value={repo.name}
            className='cursor-pointer'
          >
            {repo.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
