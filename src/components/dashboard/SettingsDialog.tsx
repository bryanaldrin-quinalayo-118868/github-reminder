import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LogIn, RefreshCw, Settings } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { msalInstance, graphScopes } from '@/config/msal'
import { getStoredUser } from '@/services/github-auth'
import { getTeamsSettings, saveTeamsSettings, markTeamsConnected } from '@/config/teams-settings'
import { fetchJoinedTeams, fetchChannels } from '@/services/graph'

function useIsSignedIn() {
  const accounts = msalInstance.getAllAccounts()
  return accounts.length > 0
}

export default function SettingsDialog() {
  const [open, setOpen] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [signedIn, setSignedIn] = useState(useIsSignedIn)


  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: fetchJoinedTeams,
    enabled: signedIn,
    staleTime: 10 * 60 * 1000,
  })

  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ['channels', selectedTeamId],
    queryFn: () => fetchChannels(selectedTeamId!),
    enabled: signedIn && !!selectedTeamId,
    staleTime: 10 * 60 * 1000,
  })

  function handleOpen(next: boolean) {
    setOpen(next)
    if (next) {
      const teamsSettings = getTeamsSettings()
      setSelectedTeamId(teamsSettings.teamId)
      setSelectedChannelId(teamsSettings.channelId)
      const isNowSignedIn = msalInstance.getAllAccounts().length > 0
      setSignedIn(isNowSignedIn)
      if (isNowSignedIn) markTeamsConnected()
    }
  }

  function handleSignIn() {
    msalInstance.loginRedirect({ scopes: graphScopes })
  }

  function handleSwitchAccount() {
    msalInstance.loginRedirect({ scopes: graphScopes, prompt: 'select_account' })
  }

  function handleTeamChange(teamId: string) {
    setSelectedTeamId(teamId)
    setSelectedChannelId(null)
    const team = teams?.find((t) => t.id === teamId)
    saveTeamsSettings({ teamId, teamName: team?.displayName ?? null, channelId: null, channelName: null })
  }

  function handleChannelChange(channelId: string) {
    setSelectedChannelId(channelId)
    const channel = channels?.find((c) => c.id === channelId)
    saveTeamsSettings({ channelId, channelName: channel?.displayName ?? null })
  }

  const account = msalInstance.getAllAccounts()[0]

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
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure Teams integration and reviewer email mappings.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className='max-h-[60vh] pr-3'>
          <div className='flex flex-col gap-4'>
            {/* GitHub Identity */}
            <div className='flex flex-col gap-3'>
              <h3 className='text-sm font-medium'>Your GitHub Account</h3>
              {(() => {
                const user = getStoredUser()
                return user ? (
                  <div className='flex items-center gap-3 rounded-md border p-3'>
                    <Avatar className='h-8 w-8 shrink-0'>
                      <AvatarImage src={user.avatar_url} alt={user.login} />
                      <AvatarFallback className='text-xs'>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className='flex flex-col'>
                      <span className='text-sm font-medium'>{user.name ?? user.login}</span>
                      <span className='text-xs text-muted-foreground'>@{user.login}</span>
                    </div>
                    <Badge variant='outline' className='ml-auto text-xs'>Logged in</Badge>
                  </div>
                ) : (
                  <p className='text-xs text-muted-foreground'>Not signed in.</p>
                )
              })()}
            </div>

            <Separator />

            {/* Teams Connection */}
            <div className='flex flex-col gap-3'>
              <h3 className='text-sm font-medium'>Teams Connection</h3>

              {signedIn ? (
                <div className='flex flex-col gap-3'>
                  <div className='flex items-center justify-between rounded-md border p-3'>
                    <div className='flex flex-col'>
                      <span className='text-sm font-medium'>{account?.name ?? 'Signed in'}</span>
                      <span className='text-xs text-muted-foreground'>{account?.username}</span>
                    </div>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='cursor-pointer gap-1.5'
                      onClick={handleSwitchAccount}
                    >
                      <RefreshCw className='h-3.5 w-3.5' />
                      Switch
                    </Button>
                  </div>

                  <div className='flex flex-col gap-1'>
                        <Label className='text-xs font-medium'>Team</Label>
                        {teamsLoading ? (
                          <Skeleton className='h-9 w-full rounded-md' />
                        ) : (
                          <Select
                            value={selectedTeamId ?? undefined}
                            onValueChange={handleTeamChange}
                          >
                            <SelectTrigger className='cursor-pointer'>
                              <SelectValue placeholder='Select a team' />
                            </SelectTrigger>
                            <SelectContent>
                              {teams?.map((team) => (
                                <SelectItem
                                  key={team.id}
                                  value={team.id}
                                  className='cursor-pointer'
                                >
                                  {team.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                  {selectedTeamId && (
                    <div className='flex flex-col gap-1'>
                      <Label className='text-xs font-medium'>Channel</Label>
                      {channelsLoading ? (
                        <Skeleton className='h-9 w-full rounded-md' />
                      ) : (
                        <Select
                          value={selectedChannelId ?? undefined}
                          onValueChange={handleChannelChange}
                        >
                          <SelectTrigger className='cursor-pointer'>
                            <SelectValue placeholder='Select a channel' />
                          </SelectTrigger>
                          <SelectContent>
                            {channels?.map((channel) => (
                              <SelectItem
                                key={channel.id}
                                value={channel.id}
                                className='cursor-pointer'
                              >
                                {channel.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className='flex flex-col gap-2'>
                  <p className='text-xs text-muted-foreground'>
                    Please use your NPI email.
                  </p>
                  <Button
                    variant='outline'
                    className='cursor-pointer gap-2'
                    onClick={handleSignIn}
                  >
                    <LogIn className='h-4 w-4' />
                    Sign in with Microsoft
                  </Button>
                </div>
              )}
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
