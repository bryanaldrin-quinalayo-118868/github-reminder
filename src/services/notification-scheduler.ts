let registration: ServiceWorkerRegistration | null = null

export async function registerNotificationSW(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  try {
    registration = await navigator.serviceWorker.register('/notification-sw.js')
  } catch (err) {
    console.error('[notification-sw] registration failed:', err)
  }
}

function getWorker(): ServiceWorker | null {
  if (!registration) return null
  return registration.active ?? registration.installing ?? registration.waiting ?? null
}

export function syncScheduleToSW(
  schedule: { enabled: boolean; time: string },
  body: string | null,
): void {
  const worker = getWorker()
  if (!worker) return
  worker.postMessage({ type: 'SYNC_SCHEDULE', payload: { schedule, body } })
}

export function fireNotificationViaSW(body: string): void {
  const worker = getWorker()
  if (!worker) {
    // Fallback: fire directly from the main thread
    if (Notification.permission === 'granted') {
      new Notification('PR Reminder', { body, icon: '/vite.svg' })
    }
    return
  }
  worker.postMessage({ type: 'FIRE_NOW', payload: { body } })
}
