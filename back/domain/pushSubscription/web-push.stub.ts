import type { PushSendResult } from '../../infrastructure/push/type';

// Stands in for WebPushService in e2e so the subscribe/unsubscribe contract is
// deterministic without VAPID keys configured (CI has none) and without hitting
// a real push service.
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
