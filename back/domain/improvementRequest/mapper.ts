import { Injectable } from '@nestjs/common';
import { ImprovementImportance, ImprovementStatus } from './enum';
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
      importance: record.importance as ImprovementImportance,
      message: record.message,
      context: record.context,
      status: record.status as ImprovementStatus,
      requestedBy: requesterEmail,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
