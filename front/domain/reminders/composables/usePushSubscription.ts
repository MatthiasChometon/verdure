import type { ComputedRef } from 'vue';
import type { PushSubscriptionInput } from '#gql';

type UsePushSubscription = {
  // The browser exposes the service worker + Push + Notification APIs at all.
  isSupported: ComputedRef<boolean>;
  // The Push subscription for this device, or undefined when there is none.
  current: () => Promise<PushSubscription | undefined>;
  // Create a subscription for the given VAPID key, ready to persist — undefined when
  // the browser can't oblige (no worker in dev, an invalid key, or the user denied it).
  create: (applicationServerKey: string) => Promise<PushSubscriptionInput | undefined>;
  // Remove this device's subscription, returning the endpoint that was dropped
  // (so the back can forget it), or undefined when there was nothing to drop.
  drop: () => Promise<string | undefined>;
};

// Raw browser side of Web Push for one device, kept apart so usePushReminders reads as
// orchestration, not plumbing. Every method returns undefined where the browser can't oblige.
export const usePushSubscription = (): UsePushSubscription => {
  const isSupported = computed(
    (): boolean =>
      import.meta.client &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window,
  );

  // The active service-worker registration, or undefined when none is registered (dev
  // serves no service worker → reminders cannot be armed there).
  const activeRegistration = (): Promise<ServiceWorkerRegistration | undefined> =>
    navigator.serviceWorker.getRegistration();

  const toInput = (subscription: PushSubscription): PushSubscriptionInput => {
    const json = subscription.toJSON();
    return {
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    };
  };

  const current = async (): Promise<PushSubscription | undefined> => {
    const registration = await activeRegistration();
    return (await registration?.pushManager.getSubscription()) ?? undefined;
  };

  const create = async (
    applicationServerKey: string,
  ): Promise<PushSubscriptionInput | undefined> => {
    const registration = await activeRegistration();
    const key = decodeVapidKey(applicationServerKey);
    if (registration === undefined || key === undefined) {
      return undefined;
    }
    const subscription = await registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: key })
      .catch(() => undefined);
    return subscription === undefined ? undefined : toInput(subscription);
  };

  const drop = async (): Promise<string | undefined> => {
    const subscription = await current();
    if (subscription === undefined) {
      return undefined;
    }
    const { endpoint } = subscription;
    await subscription.unsubscribe().catch(() => undefined);
    return endpoint;
  };

  return { isSupported, current, create, drop };
};
