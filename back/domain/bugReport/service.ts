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

    const record = await this.reports.create({
      userId: reporter.id,
      severity: input.severity,
      message: input.message,
      context: input.context,
      imageKey: input.imageKey,
    });

    // Saved first: announcing runs after the answer and can never undo or
    // delay an already-filed report.
    this.announce(record, reporter);

    return record;
  }

  private announce(record: BugReportRecord, reporter: User): void {
    this.announcer.announce({
      recipients: this.admins.recipients,
      reporterId: reporter.id,
      countSince: (userId, since) => this.reports.countSince(userId, since),
      buildMessage: (admin, filedToday) =>
        this.emailRenderer.render({
          to: admin,
          severity: record.severity,
          message: record.message,
          context: record.context,
          reportedBy: reporter.email,
          filedToday,
          hasScreenshot: record.imageKey !== null,
        }),
      failureLabel: `Signalement ${record.id} enregistré mais non annoncé`,
      // The cap silenced this round: the report itself is already safe.
      onSkipped: (filedToday) => {
        this.logger.warn(
          `Signalement ${record.id} enregistré sans notification : ${filedToday} en 24 h pour ${reporter.email}`,
        );
      },
    });
  }
}
