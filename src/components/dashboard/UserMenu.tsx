import { useState } from 'react'
import { BellRing, Heart, LogOut, Monitor, Moon, Settings, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getStoredUser } from '@/services/github-auth'
import type { PullRequest } from '@/types/github'

type UserMenuProps = {
  currentUsername: string | null;
  prs: PullRequest[];
  onLogout: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
};

export default function UserMenu({ currentUsername, onLogout, onOpenNotifications, onOpenSettings }: UserMenuProps) {
  const { theme, setTheme } = useTheme()
  const [donateOpen, setDonateOpen] = useState(false)
  const user = getStoredUser()

  const themeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const ThemeIcon = themeIcon
  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'

  function cycleTheme() {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            className='flex cursor-pointer items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <Avatar className='h-7 w-7 ring-2 ring-background'>
              {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={currentUsername ?? ''} />}
              <AvatarFallback className='text-[10px] font-medium'>
                {(currentUsername ?? '?').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className='hidden text-sm font-medium sm:inline'>
              {currentUsername ?? 'User'}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-56'>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-0.5'>
              <p className='text-sm font-medium leading-none'>{user?.name ?? currentUsername}</p>
              <p className='text-xs text-muted-foreground'>@{currentUsername}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem className='cursor-pointer' onClick={cycleTheme}>
              <ThemeIcon className='h-4 w-4' />
              Theme: {themeLabel}
            </DropdownMenuItem>
            {currentUsername && (
              <DropdownMenuItem className='cursor-pointer' onClick={onOpenNotifications}>
                <BellRing className='h-4 w-4' />
                Notifications
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className='cursor-pointer' onClick={onOpenSettings}>
              <Settings className='h-4 w-4' />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem className='cursor-pointer' onClick={() => setDonateOpen(true)}>
            <Heart className='h-4 w-4' />
            Donate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className='cursor-pointer' variant='destructive' onClick={onLogout}>
            <LogOut className='h-4 w-4' />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={donateOpen} onOpenChange={setDonateOpen}>
        <DialogContent className='max-w-sm text-center'>
          <DialogHeader>
            <DialogTitle>Donate</DialogTitle>
          </DialogHeader>
          <div className='flex flex-col items-center gap-4 py-4'>
            <Heart className='h-12 w-12 text-red-500' />
            <p className='text-lg font-semibold'>Just kidding lol</p>
            <p className='text-sm text-muted-foreground'>
              This app is free. Go buy yourself a coffee instead.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
