import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { WateringReminderService } from './reminder.service';

const JOB_NAME = 'watering-reminders';

// Daily job at REMINDER_HOUR/REMINDER_TIMEZONE (cron handles DST).
// REMINDER_ENABLED=false skips scheduling (shared dev DB checkouts).

// TODO: one app-wide send hour/timezone is a simplification — ideally each
// user gets their own quiet hours from a per-user timezone + cron/queue.
@Injectable()
export class WateringReminderScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(WateringReminderScheduler.name);

  constructor(
    private readonly reminders: WateringReminderService,
    private readonly registry: SchedulerRegistry,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get<string>('REMINDER_ENABLED') === 'false') {
      this.logger.log('Watering reminders disabled (REMINDER_ENABLED=false).');
      return;
    }
    const timeZone =
      this.config.get<string>('REMINDER_TIMEZONE') ?? 'Europe/Paris';
    const hour = this.reminderHour();
    const job = CronJob.from({
      cronTime: `0 ${hour} * * *`,
      onTick: () => void this.runOnce(),
      timeZone,
      start: true,
    });
    this.registry.addCronJob(JOB_NAME, job);
    this.logger.log(
      `Watering reminders scheduled daily at ${hour}:00 ${timeZone}.`,
    );
  }

  // Public so it can be invoked on demand (a test, a one-off admin trigger).
  async runOnce(): Promise<void> {
    const timeZone =
      this.config.get<string>('REMINDER_TIMEZONE') ?? 'Europe/Paris';
    await this.reminders.sendDueReminders(this.todayIn(timeZone));
  }

  private reminderHour(): number {
    const raw = Number(this.config.get<string>('REMINDER_HOUR') ?? '8');
    return Number.isInteger(raw) && raw >= 0 && raw <= 23 ? raw : 8;
  }

  // Today's date (YYYY-MM-DD) in the given zone — en-CA formats exactly so.
  private todayIn(timeZone: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  }
}
