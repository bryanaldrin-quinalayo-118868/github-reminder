import { GitBranch, Layers } from 'lucide-react'
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
    return (
      <div className='flex w-full items-center gap-2 rounded-md border px-3 py-2'>
        <Skeleton className='h-4 w-4 shrink-0 rounded' />
        <Skeleton className='h-4 w-40' />
      </div>
    )
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
      <SelectTrigger className='w-full cursor-pointer'>
        <div className='flex items-center gap-2'>
          <GitBranch className='h-4 w-4 text-muted-foreground' />
          <SelectValue placeholder='Select a repository' />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          value='__all__'
          className='cursor-pointer'
        >
          <span className='flex items-center gap-1.5'>
            <Layers className='h-3.5 w-3.5 text-muted-foreground' />
            All Repos
          </span>
        </SelectItem>
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
