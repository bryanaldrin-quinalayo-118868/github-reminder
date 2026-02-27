import { useState } from 'react'
import { Settings, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getAllMappings, setMappings } from '@/config/user-mappings'
import type { Reviewer } from '@/types/github'

type SettingsDialogProps = {
  reviewers: Reviewer[];
};

export default function SettingsDialog({ reviewers }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})

  function handleOpen(next: boolean) {
    if (next) {
      const saved = getAllMappings()
      const initial: Record<string, string> = {}
      for (const r of reviewers) {
        initial[r.login] = saved[r.login] ?? ''
      }
      setDraft(initial)
    }
    setOpen(next)
  }

  function handleSave() {
    setMappings(draft)
    toast.success('Mappings saved')
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpen}
    >
      <DialogTrigger asChild>
        <Button
          size='icon'
          variant='outline'
          className='cursor-pointer'
        >
          <Settings className='h-4 w-4' />
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Teams Email Mappings</DialogTitle>
          <DialogDescription>
            Map GitHub usernames to Teams emails so we can @mention reviewers.
          </DialogDescription>
        </DialogHeader>

        {reviewers.length === 0 ? (
          <p className='py-4 text-center text-sm text-muted-foreground'>
            No reviewers found. Select a repository with open PRs first.
          </p>
        ) : (
          <ScrollArea className='max-h-[50vh] pr-3'>
            <div className='flex flex-col gap-4 py-2'>
              {reviewers.map((reviewer) => (
                <div
                  key={reviewer.id}
                  className='flex items-center gap-3'
                >
                  <Avatar className='h-8 w-8 shrink-0'>
                    <AvatarImage
                      src={reviewer.avatar_url}
                      alt={reviewer.login}
                    />
                    <AvatarFallback className='text-xs'>
                      {reviewer.login.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className='flex flex-1 flex-col gap-1'>
                    <Label
                      htmlFor={`email-${reviewer.login}`}
                      className='text-xs font-medium'
                    >
                      {reviewer.login}
                    </Label>
                    <Input
                      id={`email-${reviewer.login}`}
                      type='email'
                      placeholder='user@nelnet.com'
                      value={draft[reviewer.login] ?? ''}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [reviewer.login]: e.target.value,
                        }))
                      }
                      className='h-8 text-sm'
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className='flex justify-end pt-2'>
          <Button
            size='sm'
            className='cursor-pointer gap-1.5'
            onClick={handleSave}
            disabled={reviewers.length === 0}
          >
            <Save className='h-3.5 w-3.5' />
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
