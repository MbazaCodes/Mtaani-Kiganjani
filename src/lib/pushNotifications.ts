/**
 * Browser Push Notifications for E-Mtaa
 * Requests permission and shows notifications for key events.
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showBrowserNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    tag?: string;
    onClick?: () => void;
  },
): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const notification = new Notification(title, {
    body,
    icon: options?.icon || "/tz-coat-of-arms.png",
    tag: options?.tag || "emtaa-notification",
    badge: "/tz-coat-of-arms.png",
  });

  if (options?.onClick) {
    notification.onclick = () => {
      window.focus();
      options.onClick?.();
      notification.close();
    };
  }

  // Auto-close after 8 seconds
  setTimeout(() => notification.close(), 8000);
}

/**
 * Check for new notifications and show browser alerts.
 * Call this periodically or after fetching notifications.
 */
export function notifyIfNew(
  notifications: { id: string; title: string; message: string; read: boolean }[],
  lastSeenId: string | null,
): string | null {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return lastSeenId;

  const newest = unread[0];
  if (newest.id !== lastSeenId) {
    showBrowserNotification(newest.title, newest.message);
    return newest.id;
  }
  return lastSeenId;
}
