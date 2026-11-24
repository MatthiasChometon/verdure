import type { BugSeverity, BugStatus } from './enum';

/** Gathered from the browser rather than asked, so the reporter never has to
 *  describe their own screen size. */
export type ReportContext = {
  /** The page they were on. The single most useful line for finding it again. */
  page: string;
  userAgent: string;
  /** Width by height in CSS pixels — how a layout bug is reproduced. */
  viewport: string;
  locale: string;
};

export type BugReportRecord = {
  id: string;
  userId: string | null;
  severity: BugSeverity;
  message: string;
  context: ReportContext;
  /** Storage key of an attached screenshot, or null when there is none. */
  imageKey: string | null;
  status: BugStatus;
  createdAt: Date;
};

/** What is needed to file a report; the rest is minted by the database. */
export type NewBugReport = Pick<
  BugReportRecord,
  'severity' | 'message' | 'context'
> & { userId: string; imageKey?: string | null };

/** A report plus the address to answer it at. Null once that account is gone. */
export type ReportWithReporter = BugReportRecord & {
  reporterEmail: string | null;
  reporterBlocked: boolean;
};
