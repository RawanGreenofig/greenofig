/* Greenofig push-notification service worker.
 * Registered by usePushNotifications() on first opt-in. Handles:
 *   - install/activate: take control of open clients immediately
 *   - push: render a system notification from the JSON payload
 *   - notificationclick: focus an existing tab or open a new one at
 *     the URL the server included in the payload
 */

const ICON = '/logo.png'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Greenofig', body: event.data.text() }
  }
  const { title, body, url, icon } = payload
  event.waitUntil(
    self.registration.showNotification(title || 'Greenofig', {
      body: body || '',
      icon: icon || ICON,
      badge: ICON,
      data: { url: url || '/dashboard' },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/dashboard'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate?.(url)
            return client.focus()
          }
        }
        return self.clients.openWindow(url)
      }),
  )
})
