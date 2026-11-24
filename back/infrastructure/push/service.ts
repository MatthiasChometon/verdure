import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isPushEndpoint } from '../validation/is-push-endpoint';
import webpush, { WebPushError, type PushSubscription } from 'web-push';
import {
  PushNotificationPayload,
  PushSendResult,
  PushSubscriptionRecord,
} from './type';

// A push service that never answers must not hold the reminder round.
export const PUSH_TIMEOUT_MS = 10_000;

// Wraps `web-push`. Opt-in: with no VAPID keys configured it reports itself
// unconfigured so the resolver hides the toggle and the scheduler stays idle.
@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly publicKey: string | undefined;

  constructor(config: ConfigService) {
    const publicKey = config.get<string>('VAPID_PUBLIC_KEY')?.trim() ?? '';
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY')?.trim() ?? '';
    const subject =
      config.get<string>('VAPID_SUBJECT')?.trim() ||
      'mailto:noreply@verdure.local';

    const configured = publicKey !== '' && privateKey !== '';
    this.publicKey = configured ? publicKey : undefined;
    if (configured) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    }
  }

  isConfigured(): boolean {
    return this.publicKey !== undefined;
  }

  // The application server key the browser needs to create a subscription.
  // Undefined when push is not configured (the GraphQL field then reads null).
  vapidPublicKey(): string | undefined {
    return this.publicKey;
  }

  async send(
    subscription: PushSubscriptionRecord,
    payload: PushNotificationPayload,
  ): Promise<PushSendResult> {
    if (this.publicKey === undefined) {
      return 'failed';
    }
    // Rows stored before the endpoint was validated at subscription time: never
    // call them (SSRF), and report them gone so the caller prunes the row.
    if (!isPushEndpoint(subscription.endpoint)) {
      this.logger.warn(
        'Push endpoint outside the known push services: pruned.',
      );
      return 'expired';
    }
    const target: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    };
    try {
      await webpush.sendNotification(target, JSON.stringify(payload), {
        timeout: PUSH_TIMEOUT_MS,
      });
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
