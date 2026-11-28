import type { FastifyRequest } from 'fastify';

export type UploadedImage = { buffer: Buffer; mimetype: string };

export type ClientRequest = Pick<FastifyRequest, 'ip' | 'headers'>;
