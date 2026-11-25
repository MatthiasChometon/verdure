import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import type { Ref } from 'vue';
import { usePushReminders } from './usePushReminders';

const mocks = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  usePushSubscriptionMock: vi.fn(),
}));
mockNuxtImport('useQuery', () => mocks.useQueryMock);
mockNuxtImport('useMutation', () => mocks.useMutationMock);
mockNuxtImport('usePushSubscription', () => mocks.usePushSubscriptionMock);

const input = { endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a' };

let subscribeError: Ref<Error | undefined>;
let unsubscribeError: Ref<Error | undefined>;
let push: {
  isSupported: Ref<boolean>;
  current: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  drop: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  subscribeError = ref<Error | undefined>(undefined);
  unsubscribeError = ref<Error | undefined>(undefined);
  push = {
    isSupported: ref(true),
    current: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(input),
    drop: vi.fn().mockResolvedValue(input.endpoint),
  };
  mocks.usePushSubscriptionMock.mockReturnValue({
    ...push,
    isSupported: computed(() => push.isSupported.value),
  });
  mocks.useQueryMock.mockReturnValue({
    data: ref({ webPushPublicKey: 'BKey' }),
    refresh: vi.fn().mockResolvedValue(undefined),
  });
  // useMutation is called twice, in order: subscribe, then unsubscribe.
  mocks.useMutationMock
    .mockReturnValueOnce({ execute: vi.fn().mockResolvedValue(undefined), error: subscribeError })
    .mockReturnValueOnce({
      execute: vi.fn().mockResolvedValue(undefined),
      error: unsubscribeError,
    });
  vi.stubGlobal('Notification', {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  });
});

describe('usePushReminders', () => {
  it('subscribes the device when the toggle is switched on', async () => {
    const reminders = usePushReminders();

    await reminders.toggle(true);

    expect(push.create).toHaveBeenCalledWith('BKey');
    expect(reminders.isSubscribed.value).toBe(true);
    expect(reminders.failed.value).toBe(false);
  });

  it('reports a failure when the browser cannot create the subscription', async () => {
    push.create.mockResolvedValue(undefined);
    const reminders = usePushReminders();

    await reminders.toggle(true);

    expect(reminders.failed.value).toBe(true);
    expect(reminders.isSubscribed.value).toBe(false);
  });

  it('reports a failure when the back refuses the subscription', async () => {
    subscribeError.value = new Error('refused');
    const reminders = usePushReminders();

    await reminders.toggle(true);

    expect(reminders.failed.value).toBe(true);
    expect(reminders.isSubscribed.value).toBe(false);
  });

  it('turns off locally and reports a failure when the back cannot forget the device', async () => {
    unsubscribeError.value = new Error('refused');
    const reminders = usePushReminders();

    await reminders.toggle(false);

    expect(reminders.isSubscribed.value).toBe(false);
    expect(reminders.failed.value).toBe(true);
  });

  it('turns off cleanly when the back forgets the device', async () => {
    const reminders = usePushReminders();

    await reminders.toggle(false);

    expect(reminders.failed.value).toBe(false);
  });
});
