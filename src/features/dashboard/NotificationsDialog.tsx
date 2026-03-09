import { useCallback, useEffect, useRef, useState } from 'react'
import { BellRing } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Switch } from '@/components/ui/switch'
import { getNotificationSettings, saveNotificationSettings } from '@/config/notifications'
import type { NotificationSettings } from '@/config/notifications'
import type { PullRequest } from '@/types/github'

type NotificationsDialogProps = {
  currentUsername: string | null;
  prs: PullRequest[];
};

export default function NotificationsDialog({ currentUsername, prs }: NotificationsDialogProps) {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings)
  const firedTodayRef = useRef<string | null>(null)

  async function handleSave() {
    saveNotificationSettings(settings)

    if (settings.enabled && Notification.permission === 'default') {
      await Notification.requestPermission()
    }

    toast.success('Notification settings saved')
    setOpen(false)
  }

  const buildNotificationBody = useCallback((): string | null => {
    const s = getNotificationSettings()
    if (!currentUsername) return null

    const myPrCount = s.myPrs
      ? prs.filter((pr) => pr.user.login === currentUsername).length
      : 0
    const reviewCount = s.reviewRequested
      ? prs.filter((pr) =>
          pr.pendingReviewers.some((r) => r.login === currentUsername) ||
          pr.requested_reviewers.some((r) => r.login === currentUsername),
        ).length
      : 0

    const parts: string[] = []
    if (s.myPrs) parts.push(`${myPrCount} open PR${myPrCount !== 1 ? 's' : ''}`)
    if (s.reviewRequested) parts.push(`${reviewCount} PR${reviewCount !== 1 ? 's' : ''} to review`)
    if (parts.length === 0) return null
    return `You have ${parts.join(', and ')}.`
  }, [currentUsername, prs])

  function fireNotification(body: string) {
    if (Notification.permission === 'granted') {
      new Notification('PR Reminder', { body, icon: '/vite.svg' })
    }
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
      toast.info('No PRs to report.', { duration: 3000 })
    }
  }

  // Scheduler — check every 30 seconds if it's time to fire
  useEffect(() => {
    if (!currentUsername) return

    function check() {
      const s = getNotificationSettings()
      if (!s.enabled) return

      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const currentTime = `${hh}:${mm}`
      const today = now.toDateString()

      if (currentTime !== s.time) return
      if (firedTodayRef.current === today) return
      firedTodayRef.current = today

      const body = buildNotificationBody()
      if (!body) return
      fireNotification(body)
    }

    const id = setInterval(check, 30_000)
    check() // run once immediately
    return () => clearInterval(id)
  }, [buildNotificationBody, currentUsername, prs])

  if (!currentUsername) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setSettings(getNotificationSettings()) }}>
      <DialogTrigger asChild>
        <Button size='icon-sm' variant='ghost' className='cursor-pointer'>
          <BellRing className='h-4 w-4' />
          <span className='sr-only'>Notifications</span>
        </Button>
      </DialogTrigger>
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

          {/* What to include */}
          <div className='flex flex-col gap-3'>
            <Label className='text-sm font-medium'>Include in summary</Label>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='notif-my-prs'
                checked={settings.myPrs}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, myPrs: !!checked }))}
              />
              <Label htmlFor='notif-my-prs' className='text-sm'>My open PRs</Label>
            </div>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='notif-review-requested'
                checked={settings.reviewRequested}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, reviewRequested: !!checked }))}
              />
              <Label htmlFor='notif-review-requested' className='text-sm'>PRs requesting my review</Label>
            </div>
          </div>

          {/* Preview */}
          <div className='rounded-md border bg-muted/50 p-3'>
            <p className='text-xs font-medium text-muted-foreground'>Preview</p>
            <p className='mt-1 text-sm'>
              {(() => {
                const parts: string[] = []
                if (settings.myPrs) parts.push('X open PRs')
                if (settings.reviewRequested) parts.push('X PRs to review')
                return parts.length > 0
                  ? `"You have ${parts.join(', and ')}."`
                  : 'No items selected.'
              })()}
            </p>
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
