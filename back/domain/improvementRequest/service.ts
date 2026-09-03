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
    const record = await this.requests.create(
      requester.id,
      input.importance,
      input.message,
      input.context,
    );

    // Saved first, announced after — a failure to announce never loses the idea.
    await this.announce(record, requester);

    return record;
  }

  private async announce(
    record: ImprovementRequestRecord,
    requester: User,
  ): Promise<void> {
    const outcome = await this.announcer.announce({
      recipients: this.admins.recipients,
      reporterId: requester.id,
      countSince: (userId, since) => this.requests.countSince(userId, since),
      buildMessage: (admin, filedToday) =>
        this.emailRenderer.render(
          admin,
          record.importance,
          record.message,
          record.context,
          requester.email,
          filedToday,
        ),
      onSendFailed: (error) => {
        this.logger.error(
          `Proposition ${record.id} enregistrée mais non annoncée`,
          error,
        );
      },
    });

    if (outcome.skipped) {
      this.logger.warn(
        `Proposition ${record.id} enregistrée sans notification : ${outcome.filedToday} en 24 h pour ${requester.email}`,
      );
    }
  }
}
