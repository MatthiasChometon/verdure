import type { ComputedRef } from 'vue';
import type { PushSubscriptionInput } from '#gql';

type UsePushSubscription = {
  // The browser exposes the service worker + Push + Notification APIs at all.
  isSupported: ComputedRef<boolean>;
  // The Push subscription for this device, or null when there is none.
  current: () => Promise<PushSubscription | null>;
  // Create a subscription for the given VAPID key, ready to persist — null when
  // the browser can't oblige (no worker in dev, or the user denied it).
  create: (applicationServerKey: string) => Promise<PushSubscriptionInput | null>;
  // Remove this device's subscription, returning the endpoint that was dropped
  // (so the back can forget it), or null when there was nothing to drop.
  drop: () => Promise<string | null>;
};

// Raw browser side of Web Push for one device, kept apart so usePushReminders reads as
// orchestration, not plumbing. Every method returns null where the browser can't oblige.
export const usePushSubscription = (): UsePushSubscription => {
  const isSupported = computed(
    (): boolean =>
      import.meta.client &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window,
  );

  // The active service-worker registration, or null when none is registered (dev
  // serves no service worker → reminders cannot be armed there).
  const activeRegistration = async (): Promise<ServiceWorkerRegistration | null> =>
    (await navigator.serviceWorker.getRegistration()) ?? null;

  // VAPID keys travel as base64url; Push API wants raw bytes as a BufferSource — backed
  // by an explicit ArrayBuffer (never a SharedArrayBuffer-backed view) that it accepts.
  const urlBase64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(normalised);
    const bytes = new Uint8Array(new ArrayBuffer(raw.length));
    for (let index = 0; index < raw.length; index += 1) {
      bytes[index] = raw.charCodeAt(index);
    }
    return bytes;
  };

  const toInput = (subscription: PushSubscription): PushSubscriptionInput => {
    const json = subscription.toJSON();
    return {
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    };
  };

  const current = async (): Promise<PushSubscription | null> => {
    const registration = await activeRegistration();
    return registration === null ? null : registration.pushManager.getSubscription();
  };

  const create = async (applicationServerKey: string): Promise<PushSubscriptionInput | null> => {
    const registration = await activeRegistration();
    if (registration === null) {
      return null;
    }
    const subscription = await registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
      })
      .catch(() => null);
    return subscription === null ? null : toInput(subscription);
  };

  const drop = async (): Promise<string | null> => {
    const subscription = await current();
    if (subscription === null) {
      return null;
    }
    const { endpoint } = subscription;
    await subscription.unsubscribe().catch(() => undefined);
    return endpoint;
  };

  return { isSupported, current, create, drop };
};
