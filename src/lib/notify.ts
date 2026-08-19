/**
 * Browser notifications.
 *
 * Permission is only ever requested from an explicit action — a button that
 * says what enabling notifications does — never on load. When permission is
 * missing or denied, callers fall back to sound + the ringing overlay, which
 * need no permission at all.
 */
export function notificationsSupported(): boolean {
  return typeof window.Notification === 'function'
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported'
  return window.Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await window.Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/** Fire and forget: a failed notification is never a failed timer. */
export function fireNotification(title: string, body: string): void {
  if (!notificationsSupported() || window.Notification.permission !== 'granted') return
  try {
    new window.Notification(title, { body, silent: false })
  } catch {
    // Some platforms (installed PWAs) route through a service worker; the
    // overlay and the beep carry the message either way.
  }
}
