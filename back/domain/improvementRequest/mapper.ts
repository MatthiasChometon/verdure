import { Injectable } from '@nestjs/common';
import { ImprovementRequest } from './model';
import type { ImprovementRequestRecord } from './type';

@Injectable()
export class ImprovementRequestMapper {
  toModel(
    record: ImprovementRequestRecord,
    requesterEmail: string | null,
  ): ImprovementRequest {
    return {
      id: record.id,
      importance: record.importance,
      message: record.message,
      context: record.context,
      status: record.status,
      requestedBy: requesterEmail,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
