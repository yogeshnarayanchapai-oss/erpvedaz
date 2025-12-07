// Browser Notifications API utilities

export type NotificationPermission = 'granted' | 'denied' | 'default';

export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission as NotificationPermission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.log('Browser notifications not supported');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[BrowserNotifications] Permission:', permission);
    return permission as NotificationPermission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/notification-sw.js');
    console.log('[BrowserNotifications] Service worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

export async function showBrowserNotification(
  title: string,
  options?: NotificationOptions & { url?: string }
): Promise<void> {
  if (!isNotificationSupported()) {
    console.log('Browser notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }

  try {
    // Try using service worker first for better background support
    const registration = await navigator.serviceWorker?.ready;
    
    if (registration) {
      await registration.showNotification(title, {
        body: options?.body,
        icon: options?.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: options?.tag || 'lead-notification',
        data: options?.url || '/calling/leads',
        requireInteraction: true,
      });
    } else {
      // Fallback to regular Notification API
      const notification = new Notification(title, {
        body: options?.body,
        icon: options?.icon || '/favicon.ico',
        tag: options?.tag || 'lead-notification',
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        if (options?.url) {
          window.location.href = options.url;
        }
        notification.close();
      };
    }
  } catch (error) {
    console.error('Error showing browser notification:', error);
  }
}
