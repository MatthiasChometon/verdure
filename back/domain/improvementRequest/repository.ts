import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { user } from '../user/schema';
import { improvementRequest } from './schema';
import type {
  ImprovementRequestRecord,
  RequestWithRequester,
  SuggestionContext,
} from './type';

@Injectable()
export class ImprovementRequestRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async create(
    userId: string,
    importance: string,
    message: string,
    context: SuggestionContext,
  ): Promise<ImprovementRequestRecord> {
    const [record] = await this.database
      .insert(improvementRequest)
      .values({ userId, importance, message, context })
      .returning();

    return record;
  }

  // Newest first: a list of wishes is read from the top.
  async findAll(): Promise<RequestWithRequester[]> {
    const rows = await this.database
      .select({
        request: improvementRequest,
        requesterEmail: user.email,
      })
      .from(improvementRequest)
      .leftJoin(user, eq(user.id, improvementRequest.userId))
      .orderBy(desc(improvementRequest.createdAt));

    return rows.map(({ request, requesterEmail }): RequestWithRequester => ({
      ...request,
      requesterEmail,
    }));
  }

  /** How many this account has sent since a moment — the same tally-free count
   *  as bug_report, used only to cap the announcements and never the ideas. */
  async countSince(userId: string, since: Date): Promise<number> {
    const [row] = await this.database
      .select({ total: count() })
      .from(improvementRequest)
      .where(
        and(
          eq(improvementRequest.userId, userId),
          gte(improvementRequest.createdAt, since),
        ),
      );

    return row?.total ?? 0;
  }

  async setStatus(
    id: string,
    status: string,
  ): Promise<ImprovementRequestRecord | undefined> {
    const [record] = await this.database
      .update(improvementRequest)
      .set({ status })
      .where(eq(improvementRequest.id, id))
      .returning();

    return record;
  }
}
