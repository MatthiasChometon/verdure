import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePushSubscription } from './usePushSubscription';

const subscribe = vi.fn();

beforeEach(() => {
  subscribe.mockReset().mockResolvedValue({
    endpoint: 'https://push.example/1',
    toJSON: () => ({ endpoint: 'https://push.example/1', keys: { p256dh: 'k', auth: 'a' } }),
  });
  vi.stubGlobal('navigator', {
    ...navigator,
    serviceWorker: {
      getRegistration: vi.fn().mockResolvedValue({ pushManager: { subscribe } }),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePushSubscription.create', () => {
  it('resolves undefined without asking the browser when the VAPID key is invalid', async () => {
    const result = await usePushSubscription().create('not a valid key!');

    expect(result).toBeUndefined();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('subscribes with the decoded key and returns the input to persist', async () => {
    const result = await usePushSubscription().create('AQID');

    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    });
    expect(result).toEqual({ endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a' });
  });
});
