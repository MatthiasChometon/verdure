import type { ImprovementImportance, ImprovementStatus } from './enum';

/** Same shape as a bug's context, kept local so this slice stands on its own. */
export type SuggestionContext = {
  /** The page they were on when the idea struck. */
  page: string;
  userAgent: string;
  /** Width by height in CSS pixels. */
  viewport: string;
  locale: string;
};

export type ImprovementRequestRecord = {
  id: string;
  userId: string | null;
  importance: ImprovementImportance;
  message: string;
  context: SuggestionContext;
  status: ImprovementStatus;
  createdAt: Date;
};

/** What is needed to file a suggestion; the rest is minted by the database. */
export type NewImprovementRequest = Pick<
  ImprovementRequestRecord,
  'importance' | 'message' | 'context'
> & { userId: string };

/** A suggestion plus the address to answer it at. Null once that account is gone. */
export type RequestWithRequester = ImprovementRequestRecord & {
  requesterEmail: string | null;
};
