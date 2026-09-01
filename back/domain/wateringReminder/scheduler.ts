import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { WateringReminderService } from './reminder.service';

const JOB_NAME = 'watering-reminders';

// Wires the daily reminder job. It fires once a day at REMINDER_HOUR in
// REMINDER_TIMEZONE (cron handles DST), computes "today" in that zone and hands
// it to the pure-ish reminder service. REMINDER_ENABLED=false leaves the job
// unscheduled — used on a checkout that shares the dev database so it never
// sends. Manually triggerable in a REPL/test via runOnce().
//
// TODO (production hardening, out of scope for this slice): a single app-wide
// send hour/timezone is a simplification — ideally each user picks their own
// quiet hours and we send in their local morning (the user row already carries
// a locale; a timezone column + per-user cron/queue would generalise this).
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
