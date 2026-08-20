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
