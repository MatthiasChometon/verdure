import type { FastifyRequest } from 'fastify';

// A worker authenticated by its token (its owning user + the token row).
export type Worker = { tokenId: string; userId: string };

export type WorkerRequest = FastifyRequest & { worker?: Worker };
