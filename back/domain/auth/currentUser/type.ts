import type { FastifyRequest } from 'fastify';
import type { User } from '../../user/model';

export type AuthenticatedRequest = FastifyRequest & { user?: User };

export type TokenCookieOptions = {
  httpOnly: true;
  sameSite: 'lax' | 'none';
  secure: boolean;
  path: string;
  maxAge: number;
};
