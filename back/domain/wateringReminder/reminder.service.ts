import { Injectable, Logger } from '@nestjs/common';
import type {
  PushNotificationPayload,
  PushSubscriptionRecord,
} from '../../infrastructure/push/type';
import { WebPushService } from '../../infrastructure/push/service';
import { CareDueService } from '../plantCare/due.service';
import { CareRepository } from '../plantCare/repository';
import { WateringDueService } from '../watering/due.service';
import { WateringRepository } from '../watering/repository';
import { PushSubscriptionRepository } from '../pushSubscription/repository';
import { UserRepository } from '../user/repository';
import { CareReminderMessage } from './care-message';
import { ReminderMessage } from './message';

// Orchestrates the daily reminder: notifies every subscribed device of what's
// due, pruning gone subscriptions. Due-decisions stay pure (Watering/CareDueService).
@Injectable()
export class WateringReminderService {
  private readonly logger = new Logger(WateringReminderService.name);

  constructor(
    private readonly subscriptions: PushSubscriptionRepository,
    private readonly watering: WateringRepository,
    private readonly wateringDue: WateringDueService,
    private readonly care: CareRepository,
    private readonly careDue: CareDueService,
    private readonly users: UserRepository,
    private readonly webPush: WebPushService,
    private readonly wateringMessage: ReminderMessage,
    private readonly careMessage: CareReminderMessage,
  ) {}

  async sendDueReminders(today: string): Promise<void> {
    if (!this.webPush.isConfigured()) {
      this.logger.warn('Push is not configured — skipping reminders.');
      return;
    }
    const userIds = await this.subscriptions.subscribedUserIds();
    const results = await Promise.allSettled(
      userIds.map((userId) => this.remindUser(userId, today)),
    );
    this.logFailures(userIds, results);
  }

  // One user's failure (a gone push service, a query error) must not cost the
  // others their reminder, so it is logged rather than rethrown.
  private logFailures(
    userIds: string[],
    results: PromiseSettledResult<void>[],
  ): void {
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Reminder failed for user ${userIds[index]}: ${String(result.reason)}`,
        );
      }
    });
  }

  private async remindUser(userId: string, today: string): Promise<void> {
    const locale = await this.users.localeOf(userId);
    const payloads = await this.duePayloads(userId, today, locale);
    if (payloads.length === 0) {
      return;
    }
    const subscriptions = await this.subscriptions.findByUser(userId);
    await Promise.all(
      subscriptions.map((subscription) =>
        this.notifyDevice(subscription, payloads),
      ),
    );
  }

  // The notifications due for a user today: one for watering, one for the other
  // care tasks, each present only when something of that kind is due.
  private async duePayloads(
    userId: string,
    today: string,
    locale: string,
  ): Promise<PushNotificationPayload[]> {
    const [wateringRecords, careRecords] = await Promise.all([
      this.watering.wateringRecordsFor(userId),
      this.care.careRecordsFor(userId),
    ]);
    const dueWatering = this.wateringDue.duePlants(wateringRecords, today);
    const dueCare = this.careDue.dueTasks(careRecords, today);
    const payloads: PushNotificationPayload[] = [];
    if (dueWatering.length > 0) {
      payloads.push(this.wateringMessage.build(dueWatering, locale));
    }
    if (dueCare.length > 0) {
      payloads.push(this.careMessage.build(dueCare, locale));
    }
    return payloads;
  }

  private async notifyDevice(
    subscription: PushSubscriptionRecord,
    payloads: PushNotificationPayload[],
  ): Promise<void> {
    for (const payload of payloads) {
      const result = await this.webPush.send(subscription, payload);
      if (result === 'expired') {
        await this.subscriptions.deleteByEndpoint(subscription.endpoint);
        return;
      }
    }
  }
}
