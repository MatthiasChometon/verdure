import { Logger } from '@nestjs/common';
import webpush from 'web-push';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PUSH_TIMEOUT_MS, WebPushService } from './service';
import type { PushSubscriptionRecord } from './type';

vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
  WebPushError: class WebPushError extends Error {},
}));

const config = {
  get: (name: string): string | undefined =>
    ({ VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' })[name],
};

const record = (endpoint: string): PushSubscriptionRecord => ({
  endpoint,
  p256dh: 'k',
  auth: 'a',
});
const payload = { title: 't', body: 'b', url: '/' } as never;

describe('WebPushService.send', () => {
  let service: WebPushService;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);
    service = new WebPushService(config as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('never calls an endpoint outside the known push services, and reports it expired', async () => {
    const result = await service.send(
      record('http://169.254.169.254/latest'),
      payload,
    );

    expect(result).toBe('expired');
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('caps the call to the push service with a timeout', async () => {
    const result = await service.send(
      record('https://fcm.googleapis.com/fcm/send/abc'),
      payload,
    );

    expect(result).toBe('sent');
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      { timeout: PUSH_TIMEOUT_MS },
    );
  });
});
