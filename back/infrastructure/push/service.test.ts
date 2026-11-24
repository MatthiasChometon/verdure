import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { describe, expect, it } from 'vitest';
import { WebPushService } from './service';

const serviceWith = (values: Record<string, string>): WebPushService =>
  new WebPushService(new ConfigService(values));

describe('WebPushService', () => {
  it('is off, with no public key, when no VAPID keys are set', () => {
    const service = serviceWith({});

    expect(service.isConfigured()).toBe(false);
    expect(service.vapidPublicKey()).toBeUndefined();
  });

  it('falls back to the default subject when VAPID_SUBJECT is empty', () => {
    const keys = webpush.generateVAPIDKeys();

    const service = serviceWith({
      VAPID_PUBLIC_KEY: keys.publicKey,
      VAPID_PRIVATE_KEY: keys.privateKey,
      VAPID_SUBJECT: '',
    });

    expect(service.vapidPublicKey()).toBe(keys.publicKey);
  });
});
