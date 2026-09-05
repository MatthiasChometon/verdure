import type { PushSendResult } from '../../infrastructure/push/type';

// Stands in for WebPushService in e2e: deterministic without VAPID keys (CI
// has none) and without hitting a real push service.
export class WebPushStub {
  isConfigured(): boolean {
    return true;
  }

  vapidPublicKey(): string | null {
    return 'test-vapid-public-key';
  }

  send(): Promise<PushSendResult> {
    return Promise.resolve('sent');
  }
}
