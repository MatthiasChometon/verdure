import { type SQL } from 'drizzle-orm';

export type Relevance = { where: SQL; rank: SQL };
