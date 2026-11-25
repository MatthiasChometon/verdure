/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { parseReminderPayload, safeAppPath, textReminderPayload } from './payload';
import type { ReminderPayload } from './payload';

// Precaches built assets (as generateSW did) and shows/opens watering reminders
// pushed by the back. Compiled by @vite-pwa/nuxt (injectManifest), not vue-tsc.

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const NOTIFICATION_ICON = '/pwa-192.png';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
// registerType: 'autoUpdate' — an updated worker serves the latest at once.
self.skipWaiting();
clientsClaim();

// A watering reminder: a push carrying a JSON {title, body, url}. Show it, and
// keep the worker alive until the notification is on screen.
self.addEventListener('push', (event: PushEvent) => {
  const payload = readPayload(event);
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      // One reminder at a time: a new one replaces the last unread.
      tag: 'watering-reminder',
      data: { url: payload.url },
    }),
  );
});

// Tapping the notification focuses an already-open verdure tab (navigating it to
// the reminder's target) or opens a new one.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const data: unknown = event.notification.data;
  const url = typeof data === 'object' && data !== null && 'url' in data ? data.url : undefined;
  event.waitUntil(openApp(safeAppPath(url, self.location.origin)));
});

const readPayload = (event: PushEvent): ReminderPayload => {
  if (event.data === null) {
    return parseReminderPayload(undefined, self.location.origin);
  }
  try {
    return parseReminderPayload(event.data.json(), self.location.origin);
  } catch {
    return textReminderPayload(event.data.text());
  }
};

const openApp = async (path: string): Promise<void> => {
  const target = new URL(path, self.location.origin).href;
  const windows = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  const open = windows[0];
  if (open !== undefined) {
    await open.focus();
    await open.navigate(target).catch(() => undefined);
    return;
  }
  await self.clients.openWindow(target);
};
