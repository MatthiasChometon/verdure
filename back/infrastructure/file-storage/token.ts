import type { S3Client } from '@aws-sdk/client-s3';

export const S3_CLIENT = Symbol('S3_CLIENT');
export const S3_PRESIGN_CLIENT = Symbol('S3_PRESIGN_CLIENT');

export type StorageClient = S3Client;
