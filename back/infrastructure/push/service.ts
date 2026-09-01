import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush, { WebPushError, type PushSubscription } from 'web-push';
import {
  PushNotificationPayload,
  PushSendResult,
  PushSubscriptionRecord,
} from './type';

// Wraps the `web-push` library: holds the VAPID identity and turns a stored
// subscription + payload into an encrypted Web Push message. The whole feature
// is opt-in — with no VAPID keys configured the service reports itself
// unconfigured so the resolver hides the toggle and the scheduler stays idle.
@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly publicKey: string | null;

  constructor(config: ConfigService) {
    const publicKey = config.get<string>('VAPID_PUBLIC_KEY')?.trim() ?? '';
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY')?.trim() ?? '';
    const subject =
      config.get<string>('VAPID_SUBJECT')?.trim() ??
      'mailto:noreply@verdure.local';

    const configured = publicKey !== '' && privateKey !== '';
    this.publicKey = configured ? publicKey : null;
    if (configured) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    }
  }

  isConfigured(): boolean {
    return this.publicKey !== null;
  }

  // The application server key the browser needs to create a subscription. Null
  // when push is not configured.
  vapidPublicKey(): string | null {
    return this.publicKey;
  }

  async send(
    subscription: PushSubscriptionRecord,
    payload: PushNotificationPayload,
  ): Promise<PushSendResult> {
    if (this.publicKey === null) {
      return 'failed';
    }
    const target: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    };
    try {
      await webpush.sendNotification(target, JSON.stringify(payload));
      return 'sent';
    } catch (error) {
      if (this.isGone(error)) {
        return 'expired';
      }
      this.logger.error(`Push send failed: ${String(error)}`);
      return 'failed';
    }
  }

  // 404/410 from the push service mean the browser has discarded the
  // subscription for good — it will never work again, so the caller prunes it.
  private isGone(error: unknown): boolean {
    return (
      error instanceof WebPushError &&
      (error.statusCode === 404 || error.statusCode === 410)
    );
  }
}
