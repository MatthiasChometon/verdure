import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { WorkerTokenRepository } from './repository';
import type { WorkerRequest } from './type';

// Authenticates a local worker by its `Authorization: Bearer <token>` header.
// A successful call also bumps the token's lastSeenAt (keeping it "online").
@Injectable()
export class WorkerGuard implements CanActivate {
  constructor(private readonly tokens: WorkerTokenRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WorkerRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (token === undefined) {
      throw new UnauthorizedException();
    }

    const worker = await this.tokens.authenticate(token);
    if (worker === undefined) {
      throw new UnauthorizedException();
    }

    request.worker = worker;
    return true;
  }
}
