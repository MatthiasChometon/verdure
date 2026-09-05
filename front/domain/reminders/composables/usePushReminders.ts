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
// The raw service-worker/Push plumbing lives in usePushSubscription; this stays
// the orchestration. State is per-device (a subscription belongs to one browser),
// so it lives in local refs; the dialog is the single consumer.
export const usePushReminders = (): UsePushReminders => {
  const isSubscribed = ref(false);
  const permission = ref<NotificationPermission>('default');
  const isBusy = ref(false);
  const isReady = ref(false);
  const failed = ref(false);

  const push = usePushSubscription();

  // The application server key: null until loaded, or when the back has no VAPID
  // configured (push disabled server-side → the toggle shows "unavailable").
  const { data: keyData, refresh: refreshKey } = useQuery('web-push-public-key', () =>
    GqlWebPushPublicKey(),
  );
  const publicKey = computed((): string | null => keyData.value?.webPushPublicKey ?? null);
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
    if (!push.isSupported.value) {
      isReady.value = true;
      return;
    }
    permission.value = Notification.permission;
    await refreshKey();
    isSubscribed.value = (await push.current()) !== null;
    isReady.value = true;
  };

  const toggle = async (enabled: boolean): Promise<void> => {
    failed.value = false;
    isBusy.value = true;
    await (enabled ? enable() : disable());
    isBusy.value = false;
  };

  const grantNotificationPermission = async (): Promise<boolean> => {
    permission.value = await Notification.requestPermission();
    return permission.value === 'granted';
  };

  const enable = async (): Promise<void> => {
    if (!isConfigured.value || !(await grantNotificationPermission())) {
      return;
    }
    const input = await push.create(publicKey.value!);
    if (input === null) {
      failed.value = true;
      return;
    }
    subscriptionInput.value = input;
    await runSubscribe();
    if (subscribeError.value) {
      failed.value = true;
      return;
    }
    isSubscribed.value = true;
  };

  const disable = async (): Promise<void> => {
    const endpoint = await push.drop();
    if (endpoint !== null) {
      endpointToDrop.value = endpoint;
      await runUnsubscribe();
    }
    isSubscribed.value = false;
  };

  return {
    isSupported: push.isSupported,
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
