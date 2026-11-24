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
export const JobKind = {
  IDENTIFY: 'identify',
  EMBED: 'embed',
  DIAGNOSE: 'diagnose',
} as const;
export type JobKind = (typeof JobKind)[keyof typeof JobKind];

// Why a failed identify job failed, when it helps the user act: the Pl@ntNet key
// is exhausted or unusable, the shared-key daily cap is reached, or no cloud key
// is set up at all. Matches `recognition_job.fail_reason`.
export const FailReason = {
  QUOTA: 'quota',
  LIMIT: 'limit',
  NOT_CONFIGURED: 'not-configured',
} as const;
export type FailReason = (typeof FailReason)[keyof typeof FailReason];
