import { WebPushService } from '../../infrastructure/push/service';
import type {
  PushNotificationPayload,
  PushSubscriptionRecord,
} from '../../infrastructure/push/type';
import { WateringDueService } from '../plant/watering/due.service';
import { WateringRepository } from '../plant/watering/repository';
import { WateringScheduleService } from '../plant/watering/schedule.service';
import { PushSubscriptionRepository } from '../pushSubscription/repository';
import { UserRepository } from '../user/repository';
import { ReminderMessage } from './message';
import { WateringReminderService } from './reminder.service';

const TODAY = '2026-07-15';

// Alice has a plant due today; Bob has one watered yesterday (not due).
const wateringRecordsFor = vi.fn((userId: string) =>
  Promise.resolve(
    userId === 'alice'
      ? [
          {
            id: 'p1',
            name: 'Monstera',
            lastWateredOn: '2026-07-08',
            summerDays: 7,
            winterDays: 14,
          },
        ]
      : [
          {
            id: 'p2',
            name: 'Cactus',
            lastWateredOn: '2026-07-14',
            summerDays: 7,
            winterDays: 14,
          },
        ],
  ),
);

const build = (
  subscribedUserIds: () => Promise<string[]>,
  send: (
    subscription: PushSubscriptionRecord,
    payload: PushNotificationPayload,
  ) => Promise<'sent' | 'expired' | 'failed'>,
  isConfigured = true,
): {
  service: WateringReminderService;
  deleteByEndpoint: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
} => {
  const deleteByEndpoint = vi.fn(() => Promise.resolve());
  const sendMock = vi.fn(send);
  const subscriptions = {
    subscribedUserIds,
    findByUser: (userId: string): Promise<PushSubscriptionRecord[]> =>
      Promise.resolve([
        { endpoint: `${userId}-a`, p256dh: 'k', auth: 'a' },
        { endpoint: `${userId}-b`, p256dh: 'k', auth: 'a' },
      ]),
    deleteByEndpoint,
  } as unknown as PushSubscriptionRepository;
  const watering = { wateringRecordsFor } as unknown as WateringRepository;
  const users = {
    localeOf: () => Promise.resolve('fr'),
  } as unknown as UserRepository;
  const webPush = {
    isConfigured: () => isConfigured,
    send: sendMock,
  } as unknown as WebPushService;

  const service = new WateringReminderService(
    subscriptions,
    watering,
    new WateringDueService(new WateringScheduleService()),
    users,
    webPush,
    new ReminderMessage(),
  );
  return { service, deleteByEndpoint, send: sendMock };
};

describe('WateringReminderService.sendDueReminders', () => {
  it('sends to every device of a user with due plants', async () => {
    const { service, send } = build(
      () => Promise.resolve(['alice']),
      () => Promise.resolve('sent'),
    );
    await service.sendDueReminders(TODAY);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('does not notify a user whose plants are not due', async () => {
    const { service, send } = build(
      () => Promise.resolve(['bob']),
      () => Promise.resolve('sent'),
    );
    await service.sendDueReminders(TODAY);
    expect(send).not.toHaveBeenCalled();
  });

  it('prunes a subscription the push service reports as gone', async () => {
    const { service, deleteByEndpoint } = build(
      () => Promise.resolve(['alice']),
      (subscription) =>
        Promise.resolve(
          subscription.endpoint === 'alice-a' ? 'expired' : 'sent',
        ),
    );
    await service.sendDueReminders(TODAY);
    expect(deleteByEndpoint).toHaveBeenCalledExactlyOnceWith('alice-a');
  });

  it('sends nothing when push is not configured', async () => {
    const subscribedUserIds = vi.fn(() => Promise.resolve(['alice']));
    const { service, send } = build(
      subscribedUserIds,
      () => Promise.resolve('sent'),
      false,
    );
    await service.sendDueReminders(TODAY);
    expect(send).not.toHaveBeenCalled();
    expect(subscribedUserIds).not.toHaveBeenCalled();
  });
});
