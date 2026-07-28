import { Context, Query, Resolver } from '@nestjs/graphql';
import type { FastifyRequest } from 'fastify';
import { User } from '../user/model';
import { SessionCookie } from './currentUser/cookie';
import { AuthService } from './service';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly auth: AuthService,
    private readonly cookie: SessionCookie,
  ) {}

  @Query(() => User, { nullable: true })
  me(@Context('req') request: FastifyRequest): Promise<User | undefined> {
    const token = request.cookies?.[this.cookie.token];
    if (token === undefined) {
      return Promise.resolve(undefined);
    }
    return this.auth.userFromToken(token);
  }
}
