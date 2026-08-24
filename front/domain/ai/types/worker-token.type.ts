import type { WorkerTokensQuery } from '#gql';

export type WorkerToken = WorkerTokensQuery['workerTokens'][number];
