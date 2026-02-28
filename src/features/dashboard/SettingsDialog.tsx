import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LogIn, RefreshCw, Save, Settings } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { msalInstance, graphScopes } from '@/config/msal'
import { getTeamsSettings, saveTeamsSettings } from '@/config/teams-settings'
import type { SendMode } from '@/config/teams-settings'
import { fetchMappings, saveMappings } from '@/config/user-mappings'
import { fetchJoinedTeams, fetchChannels, fetchGroupChats } from '@/services/graph'
import type { Reviewer } from '@/types/github'

type SettingsDialogProps = {
  reviewers: Reviewer[];
};

function useIsSignedIn() {
  const accounts = msalInstance.getAllAccounts()
  return accounts.length > 0
}

export default function SettingsDialog({ reviewers }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [sendMode, setSendMode] = useState<SendMode>('channel')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [signedIn, setSignedIn] = useState(useIsSignedIn)

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: fetchJoinedTeams,
    enabled: signedIn,
    staleTime: 10 * 60 * 1000,
  })

  const { data: channels } = useQuery({
    queryKey: ['channels', selectedTeamId],
    queryFn: () => fetchChannels(selectedTeamId!),
    enabled: signedIn && !!selectedTeamId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: groupChats } = useQuery({
    queryKey: ['groupChats'],
    queryFn: fetchGroupChats,
    enabled: signedIn,
    staleTime: 10 * 60 * 1000,
  })

  async function handleOpen(next: boolean) {
    if (next) {
      const saved = await fetchMappings()
      const initial: Record<string, string> = { ...saved }
      for (const r of reviewers) {
        if (!(r.login in initial)) {
          initial[r.login] = ''
        }
      }
      setDraft(initial)

      const teamsSettings = getTeamsSettings()
      setSendMode(teamsSettings.sendMode)
      setSelectedTeamId(teamsSettings.teamId)
      setSelectedChannelId(teamsSettings.channelId)
      setSelectedChatId(teamsSettings.chatId)
      setSignedIn(msalInstance.getAllAccounts().length > 0)
    }
    setOpen(next)
  }

  function handleSignIn() {
    msalInstance.loginRedirect({ scopes: graphScopes })
  }

  function handleSwitchAccount() {
    msalInstance.loginRedirect({ scopes: graphScopes, prompt: 'select_account' })
  }


  function handleModeChange(mode: string) {
    const m = mode as SendMode
    setSendMode(m)
    saveTeamsSettings({ sendMode: m })
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

  function handleChatChange(chatId: string) {
    setSelectedChatId(chatId)
    const chat = groupChats?.find((c) => c.id === chatId)
    const name = chat?.topic || chat?.members.join(', ') || 'Group chat'
    saveTeamsSettings({ chatId, chatName: name })
  }

  async function handleSave() {
    try {
      await saveMappings(draft)
      toast.success('Settings saved')
      setOpen(false)
    } catch (err) {
      toast.error(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
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
                    <Label className='text-xs font-medium'>Send to</Label>
                    <Select
                      value={sendMode}
                      onValueChange={handleModeChange}
                    >
                      <SelectTrigger className='cursor-pointer'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value='channel'
                          className='cursor-pointer'
                        >
                          Team Channel
                        </SelectItem>
                        <SelectItem
                          value='chat'
                          className='cursor-pointer'
                        >
                          Group Chat
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {sendMode === 'channel' && (
                    <>
                      <div className='flex flex-col gap-1'>
                        <Label className='text-xs font-medium'>Team</Label>
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
                      </div>

                      {selectedTeamId && (
                        <div className='flex flex-col gap-1'>
                          <Label className='text-xs font-medium'>Channel</Label>
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
                        </div>
                      )}
                    </>
                  )}

                  {sendMode === 'chat' && (
                    <div className='flex flex-col gap-1'>
                      <Label className='text-xs font-medium'>Group Chat</Label>
                      <Select
                        value={selectedChatId ?? undefined}
                        onValueChange={handleChatChange}
                      >
                        <SelectTrigger className='cursor-pointer'>
                          <SelectValue placeholder='Select a group chat' />
                        </SelectTrigger>
                        <SelectContent>
                          {groupChats?.map((chat) => (
                            <SelectItem
                              key={chat.id}
                              value={chat.id}
                              className='cursor-pointer'
                            >
                              {chat.topic || chat.members.join(', ') || 'Unnamed chat'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

            <Separator />

            {/* Email Mappings */}
            <div className='flex flex-col gap-3'>
              <h3 className='text-sm font-medium'>Reviewer Email Mappings</h3>
              <p className='text-xs text-muted-foreground'>
                Map GitHub usernames to Teams emails for @mentions.
              </p>

              {Object.keys(draft).length === 0 ? (
                <p className='py-2 text-center text-sm text-muted-foreground'>
                  No reviewers found. Select a repository with open PRs first.
                </p>
              ) : (
                <div className='flex flex-col gap-3'>
                  {Object.entries(draft).map(([login, email]) => {
                    const reviewer = reviewers.find((r) => r.login === login)
                    return (
                      <div
                        key={login}
                        className='flex items-center gap-3'
                      >
                        {reviewer ? (
                          <Avatar className='h-8 w-8 shrink-0'>
                            <AvatarImage
                              src={reviewer.avatar_url}
                              alt={login}
                            />
                            <AvatarFallback className='text-xs'>
                              {login.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <Avatar className='h-8 w-8 shrink-0'>
                            <AvatarFallback className='text-xs'>
                              {login.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className='flex flex-1 flex-col gap-1'>
                          <Label
                            htmlFor={`email-${login}`}
                            className='text-xs font-medium'
                          >
                            {login}
                          </Label>
                          <Input
                            id={`email-${login}`}
                            type='email'
                            placeholder='user@nelnet.com'
                            value={email}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                [login]: e.target.value,
                              }))
                            }
                            className='h-8 text-sm'
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className='flex justify-end pt-2'>
          <Button
            size='sm'
            className='cursor-pointer gap-1.5'
            onClick={handleSave}
          >
            <Save className='h-3.5 w-3.5' />
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
