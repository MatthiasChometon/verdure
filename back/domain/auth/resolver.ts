import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { FastifyRequest } from 'fastify';
import { User } from '../user/model';
import { UserRepository } from '../user/repository';
import { SessionCookie } from './currentUser/cookie';
import { CurrentUser } from './currentUser/current-user';
import { AuthGuard } from './currentUser/guard';
import { AuthService } from './service';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly auth: AuthService,
    private readonly cookie: SessionCookie,
    private readonly users: UserRepository,
  ) {}

  @Query(() => User, { nullable: true })
  me(@Context('req') request: FastifyRequest): Promise<User | undefined> {
    const token = request.cookies?.[this.cookie.token];
    if (token === undefined) {
      return Promise.resolve(undefined);
    }
    return this.auth.userFromToken(token);
  }

  // Save (or, with an empty value, clear) the caller's own Pl@ntNet API key, so
  // their cloud identifications run on their own 500/day quota instead of the
  // shared one. The key is stored server-side and never read back over the API.
  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async setPlantnetApiKey(
    @CurrentUser() user: User,
    @Args('key', { type: () => String, nullable: true }) key: string | null,
  ): Promise<boolean> {
    const trimmed = key?.trim();
    await this.users.setPlantnetKey(user.id, trimmed ? trimmed : null);
    return true;
  }
}
