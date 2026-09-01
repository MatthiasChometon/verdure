import { Injectable, Logger } from '@nestjs/common';
import { WebPushService } from '../../infrastructure/push/service';
import { WateringDueService } from '../plant/watering/due.service';
import { WateringRepository } from '../plant/watering/repository';
import { PushSubscriptionRepository } from '../pushSubscription/repository';
import { UserRepository } from '../user/repository';
import { ReminderMessage } from './message';

// Orchestrates the daily reminder: for each user who has a push subscription,
// find the plants due today and notify every one of their devices, pruning any
// subscription the push service reports as gone. The "which plants are due"
// decision is the pure WateringDueService; this only wires I/O around it.
@Injectable()
export class WateringReminderService {
  private readonly logger = new Logger(WateringReminderService.name);

  constructor(
    private readonly subscriptions: PushSubscriptionRepository,
    private readonly watering: WateringRepository,
    private readonly due: WateringDueService,
    private readonly users: UserRepository,
    private readonly webPush: WebPushService,
    private readonly message: ReminderMessage,
  ) {}

  async sendDueReminders(today: string): Promise<void> {
    if (!this.webPush.isConfigured()) {
      this.logger.warn('Push is not configured — skipping watering reminders.');
      return;
    }
    const userIds = await this.subscriptions.subscribedUserIds();
    await Promise.all(userIds.map((userId) => this.remindUser(userId, today)));
  }

  private async remindUser(userId: string, today: string): Promise<void> {
    const records = await this.watering.wateringRecordsFor(userId);
    const due = this.due.duePlants(records, today);
    if (due.length === 0) {
      return;
    }
    const locale = await this.users.localeOf(userId);
    const payload = this.message.build(due, locale);
    const subscriptions = await this.subscriptions.findByUser(userId);
    await Promise.all(
      subscriptions.map(async (subscription) => {
        const result = await this.webPush.send(subscription, payload);
        if (result === 'expired') {
          await this.subscriptions.deleteByEndpoint(subscription.endpoint);
        }
      }),
    );
  }
}
