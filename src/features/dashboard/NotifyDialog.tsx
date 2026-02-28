import { useState } from 'react'
import { Bell, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { msalInstance } from '@/config/msal'
import { getTeamsSettings } from '@/config/teams-settings'
import { getTeamsEmail } from '@/config/user-mappings'
import { sendChannelMessage, sendChatMessage } from '@/services/graph'
import type { Reviewer } from '@/types/github'

export type NotifyEntry = {
  prTitle: string;
  prUrl: string;
  reviewers: Reviewer[];
};

type NotifyDialogProps = {
  entries: NotifyEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ReviewerState = {
  login: string;
  email: string | null;
  avatarUrl: string;
  checked: boolean;
};

export default function NotifyDialog({ entries, open, onOpenChange }: NotifyDialogProps) {
  const isSinglePr = entries.length === 1

  const [message, setMessage] = useState('please review this PR.')
  const [sending, setSending] = useState(false)
  const [reviewerStates, setReviewerStates] = useState<Map<string, ReviewerState>>(() => {
    const map = new Map<string, ReviewerState>()
    for (const entry of entries) {
      for (const r of entry.reviewers) {
        if (!map.has(r.login)) {
          map.set(r.login, {
            login: r.login,
            email: getTeamsEmail(r.login),
            avatarUrl: r.avatar_url,
            checked: true,
          })
        }
      }
    }
    return map
  })

  function toggleReviewer(login: string) {
    setReviewerStates((prev) => {
      const next = new Map(prev)
      const item = next.get(login)
      if (item) {
        next.set(login, { ...item, checked: !item.checked })
      }
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setReviewerStates((prev) => {
      const next = new Map(prev)
      for (const [key, val] of next) {
        next.set(key, { ...val, checked })
      }
      return next
    })
  }

  async function handleSend() {
    const isSignedIn = msalInstance.getAllAccounts().length > 0
    const settings = getTeamsSettings()

    const isChannelReady = settings.sendMode === 'channel' && settings.teamId && settings.channelId
    const isChatReady = settings.sendMode === 'chat' && settings.chatId

    if (!isSignedIn || (!isChannelReady && !isChatReady)) {
      toast.warning('Teams not configured. Go to Settings to sign in and select a destination.')
      return
    }

    const checkedLogins = new Set(
      [...reviewerStates.values()].filter((r) => r.checked && r.email).map((r) => r.login),
    )

    if (checkedLogins.size === 0) {
      toast.warning('No reviewers with mapped emails selected.')
      return
    }

    setSending(true)

    try {
      for (const entry of entries) {
        const reviewerPayload = entry.reviewers
          .filter((r) => checkedLogins.has(r.login))
          .map((r) => ({ email: getTeamsEmail(r.login)!, displayName: r.login }))

        if (reviewerPayload.length === 0) continue

        if (settings.sendMode === 'chat' && settings.chatId) {
          await sendChatMessage(settings.chatId, entry.prTitle, entry.prUrl, reviewerPayload, message)
        } else if (settings.teamId && settings.channelId) {
          await sendChannelMessage(settings.teamId, settings.channelId, entry.prTitle, entry.prUrl, reviewerPayload, message)
        }
      }

      toast.success(`Notified ${checkedLogins.size} reviewer(s) across ${entries.length} PR(s).`)
      onOpenChange(false)
    } catch (err) {
      toast.error(`Failed to send: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSending(false)
    }
  }

  const allChecked = [...reviewerStates.values()].every((r) => r.checked)
  const noneChecked = [...reviewerStates.values()].every((r) => !r.checked)
  const unmappedCount = [...reviewerStates.values()].filter((r) => !r.email).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Bell className='h-4 w-4' />
            {isSinglePr ? 'Notify Reviewers' : `Notify All (${entries.length} PRs)`}
          </DialogTitle>
          <DialogDescription>
            {isSinglePr
              ? entries[0]?.prTitle
              : 'Send review reminders for all PRs with pending reviewers.'}
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label className='text-xs font-medium'>Message</Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className='rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring'
            />
            <span className='text-[11px] text-muted-foreground'>
              Sent as: &quot;🔔 PR Review Needed — [PR link] — @mentions — {message}&quot;
            </span>
          </div>

          <div className='flex flex-col gap-1.5'>
            <div className='flex items-center justify-between'>
              <Label className='text-xs font-medium'>
                Mention ({[...reviewerStates.values()].filter((r) => r.checked).length})
              </Label>
              <button
                type='button'
                onClick={() => toggleAll(!allChecked)}
                className='text-[11px] text-muted-foreground hover:text-foreground'
              >
                {allChecked ? 'Uncheck all' : 'Check all'}
              </button>
            </div>

            <div className='max-h-48 overflow-auto rounded-md border p-2'>
              {[...reviewerStates.values()].map((r) => (
                <label
                  key={r.login}
                  className='flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent'
                >
                  <input
                    type='checkbox'
                    checked={r.checked}
                    onChange={() => toggleReviewer(r.login)}
                    disabled={!r.email}
                    className='accent-primary'
                  />
                  <Avatar className='h-5 w-5'>
                    <AvatarImage src={r.avatarUrl} alt={r.login} />
                    <AvatarFallback className='text-[8px]'>
                      {r.login.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className='text-xs'>{r.login}</span>
                  {!r.email && (
                    <span className='text-[10px] text-destructive'>no email mapped</span>
                  )}
                </label>
              ))}
            </div>

            {unmappedCount > 0 && (
              <span className='text-[11px] text-muted-foreground'>
                {unmappedCount} reviewer(s) have no Teams email mapped and will be skipped.
              </span>
            )}
          </div>

          <Button
            className='cursor-pointer gap-2'
            onClick={handleSend}
            disabled={sending || noneChecked}
          >
            {sending ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Send className='h-4 w-4' />
            )}
            {sending ? 'Sending...' : 'Send Notification'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
