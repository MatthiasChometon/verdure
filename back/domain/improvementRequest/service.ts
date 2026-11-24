import { Injectable, Logger } from '@nestjs/common';
import { AdminAnnouncer } from '../adminNotice/announcer';
import { Admins } from '../bugReport/admins.service';
import { User } from '../user/model';
import { ImprovementRequestEmailRenderer } from './email-renderer';
import type { RequestImprovementInput } from './input';
import { ImprovementRequestRepository } from './repository';
import type { ImprovementRequestRecord } from './type';

@Injectable()
export class ImprovementRequestService {
  private readonly logger = new Logger(ImprovementRequestService.name);

  constructor(
    private readonly requests: ImprovementRequestRepository,
    private readonly admins: Admins,
    private readonly announcer: AdminAnnouncer,
    private readonly emailRenderer: ImprovementRequestEmailRenderer,
  ) {}

  async request(
    requester: User,
    input: RequestImprovementInput,
  ): Promise<ImprovementRequestRecord> {
    const record = await this.requests.create({
      userId: requester.id,
      importance: input.importance,
      message: input.message,
      context: input.context,
    });

    // Saved first, announced after the answer: announcing never loses the idea.
    this.announce(record, requester);

    return record;
  }

  private announce(record: ImprovementRequestRecord, requester: User): void {
    this.announcer.announce({
      recipients: this.admins.recipients,
      reporterId: requester.id,
      countSince: (userId, since) => this.requests.countSince(userId, since),
      buildMessage: (admin, filedToday) =>
        this.emailRenderer.render({
          to: admin,
          importance: record.importance,
          message: record.message,
          context: record.context,
          requestedBy: requester.email,
          filedToday,
        }),
      failureLabel: `Proposition ${record.id} enregistrée mais non annoncée`,
      onSkipped: (filedToday) => {
        this.logger.warn(
          `Proposition ${record.id} enregistrée sans notification : ${filedToday} en 24 h pour ${requester.email}`,
        );
      },
    });
  }
}
