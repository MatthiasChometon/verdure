import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AdminAnnouncer } from '../adminNotice/announcer';
import { User } from '../user/model';
import { Admins } from './admins.service';
import { BugReportEmailRenderer } from './email-renderer';
import type { ReportBugInput } from './input';
import { BugReportRepository } from './repository';
import type { BugReportRecord } from './type';

@Injectable()
export class BugReportService {
  private readonly logger = new Logger(BugReportService.name);

  constructor(
    private readonly reports: BugReportRepository,
    private readonly admins: Admins,
    private readonly announcer: AdminAnnouncer,
    private readonly emailRenderer: BugReportEmailRenderer,
  ) {}

  async report(
    reporter: User,
    input: ReportBugInput,
  ): Promise<BugReportRecord> {
    // Checked before anything is written: a blocked account should not be able
    // to fill the table either, and the refusal costs one lookup.
    if (await this.reports.isBlocked(reporter.id)) {
      throw new ForbiddenException('This account can no longer send reports.');
    }

    const record = await this.reports.create(
      reporter.id,
      input.severity,
      input.message,
      input.context,
      input.imageKey ?? null,
    );

    // Saved first, announced after — and a failure to announce does not undo
    // the report. Somebody took the trouble to describe a problem; losing it
    // because a mail server was down would be the worse of the two failures.
    await this.announce(record, reporter);

    return record;
  }

  private async announce(
    record: BugReportRecord,
    reporter: User,
  ): Promise<void> {
    const outcome = await this.announcer.announce({
      recipients: this.admins.recipients,
      reporterId: reporter.id,
      countSince: (userId, since) => this.reports.countSince(userId, since),
      buildMessage: (admin, filedToday) =>
        this.emailRenderer.render(
          admin,
          record.severity,
          record.message,
          record.context,
          reporter.email,
          filedToday,
          record.imageKey !== null,
        ),
      // Logged rather than thrown: the reader has done their part, and their
      // report is already safe in the database.
      onSendFailed: (error) => {
        this.logger.error(
          `Signalement ${record.id} enregistré mais non annoncé`,
          error,
        );
      },
    });

    // The cap silenced this round — the report itself is already safe.
    if (outcome.skipped) {
      this.logger.warn(
        `Signalement ${record.id} enregistré sans notification : ${outcome.filedToday} en 24 h pour ${reporter.email}`,
      );
    }
  }
}
