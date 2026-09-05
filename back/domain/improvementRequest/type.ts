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
  importance: string;
  message: string;
  context: SuggestionContext;
  status: string;
  createdAt: Date;
};

/** A suggestion plus the address to answer it at. Null once that account is gone. */
export type RequestWithRequester = ImprovementRequestRecord & {
  requesterEmail: string | null;
};
