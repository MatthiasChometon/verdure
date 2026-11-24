import { Injectable } from '@nestjs/common';
import { BugReport } from './model';
import type { BugReportRecord } from './type';

@Injectable()
export class BugReportMapper {
  toModel(
    record: BugReportRecord,
    reporterEmail: string | null,
    reporterBlocked = false,
  ): BugReport {
    return {
      id: record.id,
      severity: record.severity,
      message: record.message,
      context: record.context,
      imageKey: record.imageKey,
      status: record.status,
      reportedBy: reporterEmail,
      reporterBlocked,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
