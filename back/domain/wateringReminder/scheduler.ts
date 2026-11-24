import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { BackgroundTasks } from '../../infrastructure/background/service';
import { WateringReminderService } from './reminder.service';

const JOB_NAME = 'watering-reminders';
const DEFAULT_HOUR = 8;
const DEFAULT_TIMEZONE = 'Europe/Paris';
// A round that outlives this is logged as failed, but stays "running" (and so
// blocks the next tick) until it really ends.
export const REMINDER_TIMEOUT_MS = 30 * 60 * 1000;

// Daily job at REMINDER_HOUR/REMINDER_TIMEZONE (cron handles DST). The settings
// are validated at boot (infrastructure/config/env.ts).
// REMINDER_ENABLED=false skips scheduling (shared dev DB checkouts).

// TODO: one app-wide send hour/timezone is a simplification — ideally each
// user gets their own quiet hours from a per-user timezone + cron/queue.
@Injectable()
export class WateringReminderScheduler
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(WateringReminderScheduler.name);
  private running = false;

  constructor(
    private readonly reminders: WateringReminderService,
    private readonly registry: SchedulerRegistry,
    private readonly config: ConfigService,
    private readonly background: BackgroundTasks,
  ) {}

  onApplicationBootstrap(): void {
    if (this.setting('REMINDER_ENABLED') === 'false') {
      this.logger.log('Watering reminders disabled (REMINDER_ENABLED=false).');
      return;
    }
    const timeZone = this.timeZone();
    const hour = Number(this.setting('REMINDER_HOUR') ?? DEFAULT_HOUR);
    const job = CronJob.from({
      cronTime: `0 ${hour} * * *`,
      onTick: () => this.tick(),
      timeZone,
      start: true,
    });
    this.registry.addCronJob(JOB_NAME, job);
    this.logger.log(
      `Watering reminders scheduled daily at ${hour}:00 ${timeZone}.`,
    );
  }

  // No new round may start while the app is closing; a running one is drained
  // by the database module before the pool ends.
  onModuleDestroy(): void {
    if (this.registry.doesExist('cron', JOB_NAME)) {
      this.registry.deleteCronJob(JOB_NAME);
    }
  }

  // The cron callback: hands the round to the background registry (there is
  // nobody to reject to, and the shutdown drain must see it). A round still
  // running from yesterday is not doubled up: users would be pushed twice.
  tick(): void {
    if (this.running) {
      this.logger.warn('Previous watering reminders round still running.');
      return;
    }
    this.running = true;
    this.background.run(
      'Watering reminders',
      async () => {
        try {
          await this.runOnce();
        } finally {
          this.running = false;
        }
      },
      REMINDER_TIMEOUT_MS,
    );
  }

  // Public so it can be invoked on demand (a test, a one-off admin trigger).
  async runOnce(): Promise<void> {
    await this.reminders.sendDueReminders(this.todayIn(this.timeZone()));
  }

  // A blank value means "unset", like in the boot check.
  private setting(name: string): string | undefined {
    const value = this.config.get<string>(name)?.trim();
    return value === '' ? undefined : value;
  }

  private timeZone(): string {
    return this.setting('REMINDER_TIMEZONE') ?? DEFAULT_TIMEZONE;
  }

  // Today's date (YYYY-MM-DD) in the given zone — en-CA formats exactly so.
  private todayIn(timeZone: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  }
}
