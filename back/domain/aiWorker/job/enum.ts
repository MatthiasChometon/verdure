import { registerEnumType } from '@nestjs/graphql';

// Values match the `recognition_job.status` text column, so the DB value maps
// straight to the GraphQL enum.
export enum RecognitionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DONE = 'done',
  FAILED = 'failed',
}

registerEnumType(RecognitionStatus, { name: 'RecognitionStatus' });

// What a queued job asks the worker to do. Matches `recognition_job.kind`.
// Internal (never exposed over GraphQL).
export enum JobKind {
  IDENTIFY = 'identify',
  EMBED = 'embed',
  DIAGNOSE = 'diagnose',
}
