import { Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AiService } from '../../infrastructure/ai/service';
import { type Database } from '../../infrastructure/database/token';
import { WebPushService } from '../../infrastructure/push/service';
import type {
  PushNotificationPayload,
  PushSendResult,
  PushSubscriptionRecord,
} from '../../infrastructure/push/type';
import { bootTestApp } from '../../infrastructure/testing/test-app';
import { AiStub } from '../plant/ai.stub';
import { plant } from '../plant/schema';
import { CareType } from '../plantCare/enum';
import { careSchedule } from '../plantCare/schema';
import { pushSubscription } from '../pushSubscription/schema';
import { user } from '../user/schema';
import { insertTestUser } from '../user/test-user';
import { wateringEvent } from '../watering/schema';
import { UserRepository } from '../user/repository';
import { WateringReminderService } from './reminder.service';

const TODAY = '2026-07-15';

type Sent = { endpoint: string; payload: PushNotificationPayload };

// The push service is the boundary: it records what it was asked to send and
// answers per endpoint.
class PushBoundary {
  readonly sent: Sent[] = [];
  results = new Map<string, PushSendResult>();
  broken = new Set<string>();
  configured = true;

  isConfigured(): boolean {
    return this.configured;
  }

  vapidPublicKey(): string | undefined {
    return 'test-vapid-public-key';
  }

  send(
    subscription: PushSubscriptionRecord,
    payload: PushNotificationPayload,
  ): Promise<PushSendResult> {
    if (this.broken.has(subscription.endpoint)) {
      return Promise.reject(new Error('push service unreachable'));
    }
    this.sent.push({ endpoint: subscription.endpoint, payload });
    return Promise.resolve(this.results.get(subscription.endpoint) ?? 'sent');
  }
}

describe('watering reminders (e2e)', () => {
  const push = new PushBoundary();
  let database: Database;
  let reminders: WateringReminderService;
  let close: () => Promise<void>;
  let application: { get<T>(token: new (...args: never[]) => T): T };

  const wipe = async (): Promise<void> => {
    await database.delete(pushSubscription);
    await database.delete(plant);
    await database.delete(user);
  };

  // A user with two devices and one plant (watered `lastWateredOn`).
  const userWithPlant = async (
    name: string,
    lastWateredOn: string,
  ): Promise<string> => {
    const { id } = await insertTestUser(database, name);
    for (const device of ['a', 'b']) {
      await database.insert(pushSubscription).values({
        userId: id,
        endpoint: `${name}-${device}`,
        p256dh: 'k',
        auth: 'a',
      });
    }
    const [plantRow] = await database
      .insert(plant)
      .values({
        userId: id,
        name: `${name}'s plant`,
        species: 'Plantus',
        wateringIntervalSummerDays: 7,
        wateringIntervalWinterDays: 14,
      })
      .returning({ id: plant.id });
    await database.insert(wateringEvent).values({
      plantId: plantRow?.id ?? '',
      userId: id,
      wateredOn: lastWateredOn,
    });
    return plantRow?.id ?? '';
  };

  beforeAll(async () => {
    const booted = await bootTestApp([
      { provide: AiService, useValue: new AiStub() },
      { provide: WebPushService, useValue: push },
    ]);
    database = booted.database;
    reminders = booted.app.get(WateringReminderService);
    application = booted.app;
    close = () => booted.app.close();
    await wipe();
  });
  afterAll(async () => {
    await wipe();
    await close();
  });
  afterEach(() => vi.restoreAllMocks());
  beforeEach(async () => {
    await wipe();
    push.sent.length = 0;
    push.results = new Map();
    push.broken = new Set();
    push.configured = true;
  });

  it('sends to every device of a user with due plants', async () => {
    await userWithPlant('alice', '2026-07-08');

    await reminders.sendDueReminders(TODAY);

    expect(push.sent.map((sent) => sent.endpoint).sort()).toEqual([
      'alice-a',
      'alice-b',
    ]);
  });

  it('does not notify a user with nothing due', async () => {
    await userWithPlant('bob', '2026-07-14');

    await reminders.sendDueReminders(TODAY);

    expect(push.sent).toEqual([]);
  });

  it('sends a care notification for a task that falls due today', async () => {
    const plantId = await userWithPlant('bob', '2026-07-14');
    const [bob] = await database
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, 'bob@test.dev'));
    await database.insert(careSchedule).values({
      plantId,
      userId: bob?.id ?? '',
      careType: CareType.FERTILIZING,
      intervalDays: 30,
      lastDoneOn: '2026-06-15',
    });

    await reminders.sendDueReminders(TODAY);

    expect(push.sent).toHaveLength(2);
    expect(
      push.sent.every((sent) => sent.payload.body.includes('engrais')),
    ).toBe(true);
  });

  it('prunes a subscription the push service reports as gone', async () => {
    await userWithPlant('alice', '2026-07-08');
    push.results.set('alice-a', 'expired');

    await reminders.sendDueReminders(TODAY);

    const left = await database.select().from(pushSubscription);
    expect(left.map((row) => row.endpoint)).toEqual(['alice-b']);
  });

  it('reminds every user, past the size of one batch', async () => {
    for (let index = 0; index < 45; index += 1) {
      await userWithPlant(`user${index}`, '2026-07-08');
    }

    await reminders.sendDueReminders(TODAY);

    expect(new Set(push.sent.map((sent) => sent.endpoint)).size).toBe(90);
  });

  it('never works on more than one batch of users at a time', async () => {
    for (let index = 0; index < 45; index += 1) {
      await userWithPlant(`user${index}`, '2026-07-08');
    }
    const users = application.get(UserRepository);
    const lookup = users.localeOf.bind(users);
    let inFlight = 0;
    let peak = 0;
    vi.spyOn(users, 'localeOf').mockImplementation(async (id) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      // Holds the user so that every user started together overlaps.
      await new Promise((resolve) => setTimeout(resolve, 5));
      const locale = await lookup(id);
      inFlight -= 1;
      return locale;
    });

    await reminders.sendDueReminders(TODAY);

    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(20);
  });

  it('still reminds the other users when one of them fails', async () => {
    await userWithPlant('alice', '2026-07-08');
    await userWithPlant('carol', '2026-07-08');
    push.broken.add('alice-a');
    push.broken.add('alice-b');
    const logged = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(reminders.sendDueReminders(TODAY)).resolves.toBeUndefined();

    expect(push.sent.map((sent) => sent.endpoint).sort()).toEqual([
      'carol-a',
      'carol-b',
    ]);
    expect(logged).toHaveBeenCalledOnce();
  });

  it('sends nothing when push is not configured', async () => {
    await userWithPlant('alice', '2026-07-08');
    push.configured = false;

    await reminders.sendDueReminders(TODAY);

    expect(push.sent).toEqual([]);
  });
});
