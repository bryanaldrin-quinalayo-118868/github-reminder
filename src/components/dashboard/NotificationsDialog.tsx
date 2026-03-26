import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { getNotificationSettings, saveNotificationSettings } from '@/config/notifications'
import type { NotificationSettings } from '@/config/notifications'
import { fireNotificationViaSW, syncScheduleToSW } from '@/services/notification-scheduler'
import type { PullRequest } from '@/types/github'

type NotificationsDialogProps = {
  currentUsername: string | null;
  prs: PullRequest[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function computeCounts(prs: PullRequest[], username: string) {
  const myPrs = prs.filter((pr) => pr.user.login === username)
  const reviewRequested = prs.filter((pr) =>
    pr.pendingReviewers.some((r) => r.login === username) ||
    pr.requested_reviewers.some((r) => r.login === username),
  )
  const myPrsWithConflicts = myPrs.filter((pr) => pr.mergeableState === 'dirty')
  const myPrsReadyToMerge = myPrs.filter((pr) => pr.mergeableState === 'clean')
  const myPrsChangesRequested = myPrs.filter((pr) =>
    pr.pendingReviewers.some((r) => r.reviewStatus === 'changes-requested'),
  )

  return {
    myPrs: myPrs.length,
    reviewRequested: reviewRequested.length,
    myPrsWithConflicts: myPrsWithConflicts.length,
    myPrsReadyToMerge: myPrsReadyToMerge.length,
    myPrsChangesRequested: myPrsChangesRequested.length,
    totalOpenPrs: prs.length,
  }
}

function buildBody(
  settings: NotificationSettings,
  counts: ReturnType<typeof computeCounts>,
): string | null {
  const lines: string[] = []

  // Opening line — summarize "your" PRs and review requests
  const openers: string[] = []
  if (settings.myPrs) openers.push(`${counts.myPrs} open PR${counts.myPrs !== 1 ? 's' : ''}`)
  if (settings.reviewRequested) openers.push(`${counts.reviewRequested} pending review${counts.reviewRequested !== 1 ? 's' : ''}`)
  if (openers.length > 0) lines.push(`You have ${openers.join(' and ')}.`)

  // Detail lines — actionable alerts
  const alerts: string[] = []
  if (settings.myPrsWithConflicts && counts.myPrsWithConflicts > 0) {
    alerts.push(`${counts.myPrsWithConflicts} with merge conflicts`)
  }
  if (settings.myPrsChangesRequested && counts.myPrsChangesRequested > 0) {
    alerts.push(`${counts.myPrsChangesRequested} with changes requested`)
  }
  if (settings.myPrsReadyToMerge && counts.myPrsReadyToMerge > 0) {
    alerts.push(`${counts.myPrsReadyToMerge} ready to merge`)
  }
  if (alerts.length > 0) lines.push(alerts.join(', ') + '.')

  // Closing line — total across all repos
  if (settings.totalOpenPrs) {
    lines.push(`${counts.totalOpenPrs} total open PR${counts.totalOpenPrs !== 1 ? 's' : ''} across all repos.`)
  }

  return lines.length > 0 ? lines.join('\n') : null
}

export default function NotificationsDialog({ currentUsername, prs, open: controlledOpen, onOpenChange: controlledOnOpenChange }: NotificationsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings)

  const counts = currentUsername ? computeCounts(prs, currentUsername) : null

  async function handleSave() {
    saveNotificationSettings(settings)

    if (settings.enabled && Notification.permission === 'default') {
      await Notification.requestPermission()
    }

    // Immediately sync new settings to the service worker
    const body = currentUsername ? buildNotificationBody() : null
    syncScheduleToSW({ enabled: settings.enabled, time: settings.time }, body)

    toast.success('Notification settings saved')
    setOpen(false)
  }

  const buildNotificationBody = useCallback((): string | null => {
    const s = getNotificationSettings()
    if (!currentUsername) return null
    const c = computeCounts(prs, currentUsername)
    return buildBody(s, c)
  }, [currentUsername, prs])

  function fireNotification(body: string) {
    fireNotificationViaSW(body)
    toast.info(body, { duration: 10000 })
  }

  async function handleTest() {
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    if (Notification.permission === 'denied') {
      toast.warning('Browser notifications are blocked. Please enable them in your browser/OS settings.', { duration: 8000 })
      return
    }
    const body = buildNotificationBody()
    if (body) {
      fireNotification(body)
      if (Notification.permission === 'granted') {
        toast.success('Browser notification sent! If you don\'t see it, check your OS notification settings.', { duration: 5000 })
      }
    } else {
      toast.info('No items selected for notification.', { duration: 3000 })
    }
  }

  // Sync schedule + notification body to the service worker whenever data changes
  useEffect(() => {
    const s = getNotificationSettings()
    const body = currentUsername ? buildNotificationBody() : null
    syncScheduleToSW({ enabled: s.enabled, time: s.time }, body)
  }, [buildNotificationBody, currentUsername, prs])

  if (!currentUsername) return null

  const preview = counts ? buildBody(settings, counts) : null

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setSettings(getNotificationSettings()) }}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>Daily Notifications</DialogTitle>
          <DialogDescription>
            Get a browser notification with your PR summary at a scheduled time.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-5 py-2'>
          {/* Enable toggle */}
          <div className='flex items-center justify-between'>
            <Label htmlFor='notif-enabled' className='text-sm font-medium'>Enable notifications</Label>
            <Switch
              id='notif-enabled'
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings((s) => ({ ...s, enabled: checked }))}
            />
          </div>

          {/* Time picker */}
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='notif-time' className='text-sm font-medium'>Notification time (PHT)</Label>
            <Input
              id='notif-time'
              type='time'
              value={settings.time}
              onChange={(e) => setSettings((s) => ({ ...s, time: e.target.value }))}
              className='h-8 w-32 text-sm font-mono'
            />
          </div>

          <Separator />

          {/* What to include */}
          <div className='flex flex-col gap-3'>
            <Label className='text-sm font-medium'>Include in summary</Label>

            <div className='flex items-center gap-2'>
              <Checkbox
                id='notif-my-prs'
                checked={settings.myPrs}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, myPrs: !!checked }))}
              />
              <Label htmlFor='notif-my-prs' className='text-sm cursor-pointer'>My open PRs</Label>
            </div>

            <div className='flex items-center gap-2'>
              <Checkbox
                id='notif-review-requested'
                checked={settings.reviewRequested}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, reviewRequested: !!checked }))}
              />
              <Label htmlFor='notif-review-requested' className='text-sm cursor-pointer'>PRs requesting my review</Label>
            </div>

            <div className='flex items-center gap-2'>
              <Checkbox
                id='notif-conflicts'
                checked={settings.myPrsWithConflicts}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, myPrsWithConflicts: !!checked }))}
              />
              <Label htmlFor='notif-conflicts' className='text-sm cursor-pointer'>My PRs with merge conflicts</Label>
            </div>

            <div className='flex items-center gap-2'>
              <Checkbox
                id='notif-changes-requested'
                checked={settings.myPrsChangesRequested}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, myPrsChangesRequested: !!checked }))}
              />
              <Label htmlFor='notif-changes-requested' className='text-sm cursor-pointer'>My PRs with changes requested</Label>
            </div>

            <div className='flex items-center gap-2'>
              <Checkbox
                id='notif-ready-to-merge'
                checked={settings.myPrsReadyToMerge}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, myPrsReadyToMerge: !!checked }))}
              />
              <Label htmlFor='notif-ready-to-merge' className='text-sm cursor-pointer'>My PRs ready to merge</Label>
            </div>

            <div className='flex items-center gap-2'>
              <Checkbox
                id='notif-total'
                checked={settings.totalOpenPrs}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, totalOpenPrs: !!checked }))}
              />
              <Label htmlFor='notif-total' className='text-sm cursor-pointer'>Total open PRs across all repos</Label>
            </div>
          </div>

          <Separator />

          {/* Live Preview */}
          <div className='rounded-md border bg-muted/50 p-3'>
            <p className='text-xs font-medium text-muted-foreground'>Preview (live)</p>
            {preview ? (
              <div className='mt-1.5 flex flex-col gap-0.5'>
                {preview.split('\n').map((line, i) => (
                  <p key={i} className='text-sm'>{line}</p>
                ))}
              </div>
            ) : (
              <p className='mt-1 text-sm text-muted-foreground italic'>No items selected.</p>
            )}
          </div>

          <div className='flex gap-2'>
            <Button className='flex-1 cursor-pointer' onClick={handleSave}>Save</Button>
            <Button variant='outline' className='cursor-pointer' onClick={handleTest}>Test</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
