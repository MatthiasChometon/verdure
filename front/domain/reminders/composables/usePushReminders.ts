import type { ComputedRef, Ref } from 'vue';
import type { PushSubscriptionInput } from '#gql';

type UsePushReminders = {
  // The browser exposes the Notification + Push APIs at all.
  isSupported: ComputedRef<boolean>;
  // The back has VAPID configured (a public key to subscribe with).
  isConfigured: ComputedRef<boolean>;
  // A push subscription exists for this device.
  isSubscribed: Ref<boolean>;
  permission: Ref<NotificationPermission>;
  isBusy: Ref<boolean>;
  // The current state has been read (public key + existing subscription).
  isReady: Ref<boolean>;
  // The last enable/disable failed for a reason other than a denied permission.
  failed: Ref<boolean>;
  refreshState: () => Promise<void>;
  toggle: (enabled: boolean) => Promise<void>;
};

// Owns the browser side of watering reminders: reading whether this device is
// subscribed, requesting the Notification permission, and creating/removing the
// Push subscription — persisting each change through the guarded back mutations.
// State is per-device (a subscription belongs to one browser), so it lives in
// local refs; the dialog is the single consumer.
export const usePushReminders = (): UsePushReminders => {
  const isSubscribed = ref(false);
  const permission = ref<NotificationPermission>('default');
  const isBusy = ref(false);
  const isReady = ref(false);
  const failed = ref(false);

  // The application server key: null until loaded, or when the back has no VAPID
  // configured (push disabled server-side → the toggle shows "unavailable").
  const { data: keyData, refresh: refreshKey } = useQuery('web-push-public-key', () =>
    GqlWebPushPublicKey(),
  );
  const publicKey = computed((): string | null => keyData.value?.webPushPublicKey ?? null);

  const isSupported = computed(
    (): boolean =>
      import.meta.client &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window,
  );
  const isConfigured = computed((): boolean => publicKey.value !== null);

  const subscriptionInput = ref<PushSubscriptionInput | null>(null);
  const { execute: runSubscribe, error: subscribeError } = useMutation(() =>
    GqlSubscribeToPush({ input: subscriptionInput.value! }),
  );

  const endpointToDrop = ref('');
  const { execute: runUnsubscribe } = useMutation(() =>
    GqlUnsubscribeFromPush({ endpoint: endpointToDrop.value }),
  );

  const refreshState = async (): Promise<void> => {
    isReady.value = false;
    failed.value = false;
    if (!isSupported.value) {
      isReady.value = true;
      return;
    }
    permission.value = Notification.permission;
    await refreshKey();
    isSubscribed.value = (await currentSubscription()) !== null;
    isReady.value = true;
  };

  const toggle = async (enabled: boolean): Promise<void> => {
    failed.value = false;
    isBusy.value = true;
    await (enabled ? enable() : disable());
    isBusy.value = false;
  };

  const enable = async (): Promise<void> => {
    if (!isConfigured.value) {
      return;
    }
    permission.value = await Notification.requestPermission();
    if (permission.value !== 'granted') {
      return;
    }
    const registration = await activeRegistration();
    if (registration === null) {
      failed.value = true;
      return;
    }
    const subscription = await subscribe(registration);
    if (subscription === null) {
      failed.value = true;
      return;
    }
    subscriptionInput.value = toInput(subscription);
    await runSubscribe();
    if (subscribeError.value) {
      failed.value = true;
      return;
    }
    isSubscribed.value = true;
  };

  const disable = async (): Promise<void> => {
    const subscription = await currentSubscription();
    if (subscription !== null) {
      endpointToDrop.value = subscription.endpoint;
      await subscription.unsubscribe().catch(() => undefined);
      await runUnsubscribe();
    }
    isSubscribed.value = false;
  };

  // The active service-worker registration, or null when none is registered
  // (dev serves no service worker → reminders cannot be armed there).
  const activeRegistration = async (): Promise<ServiceWorkerRegistration | null> =>
    (await navigator.serviceWorker.getRegistration()) ?? null;

  const currentSubscription = async (): Promise<PushSubscription | null> => {
    const registration = await activeRegistration();
    return registration === null ? null : registration.pushManager.getSubscription();
  };

  const subscribe = (registration: ServiceWorkerRegistration): Promise<PushSubscription | null> =>
    registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey.value!),
      })
      .catch(() => null);

  const toInput = (subscription: PushSubscription): PushSubscriptionInput => {
    const json = subscription.toJSON();
    return {
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    };
  };

  // VAPID keys travel as base64url; the Push API wants the raw bytes. Backed by
  // an explicit ArrayBuffer so the result is a BufferSource (not a possibly
  // SharedArrayBuffer-backed view) that applicationServerKey accepts.
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

  return {
    isSupported,
    isConfigured,
    isSubscribed,
    permission,
    isBusy,
    isReady,
    failed,
    refreshState,
    toggle,
  };
};
