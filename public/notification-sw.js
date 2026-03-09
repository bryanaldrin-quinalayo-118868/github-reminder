/// <reference lib="webworker" />

/** @type {string | null} */
let cachedBody = null
/** @type {{ enabled: boolean; time: string } | null} */
let schedule = null
/** @type {string | null} */
let firedToday = null

let timerId = null

function startTimer() {
  if (timerId) return
  timerId = setInterval(check, 30_000)
  check()
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

function check() {
  if (!schedule || !schedule.enabled || !cachedBody) return

  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const currentTime = `${hh}:${mm}`
  const today = now.toDateString()

  if (currentTime !== schedule.time) return
  if (firedToday === today) return
  firedToday = today

  self.registration.showNotification('PR Reminder', {
    body: cachedBody,
    icon: '/vite.svg',
  })
}

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {}

  switch (type) {
    case 'SYNC_SCHEDULE': {
      schedule = payload.schedule
      cachedBody = payload.body

      if (schedule && schedule.enabled) {
        startTimer()
      } else {
        stopTimer()
      }
      break
    }

    case 'FIRE_NOW': {
      const body = payload?.body
      if (body) {
        self.registration.showNotification('PR Reminder', {
          body,
          icon: '/vite.svg',
        })
      }
      break
    }

    case 'RESET_FIRED_TODAY': {
      firedToday = null
      break
    }
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    }),
  )
})
