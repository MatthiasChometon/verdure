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

  // Public: lets the sign-in dialog hide the Google button when Google is not
  // configured (a fresh dev checkout), so it is never shown broken.
  @Query(() => Boolean)
  googleEnabled(): boolean {
    return this.auth.isGoogleEnabled();
  }

  @Query(() => User, { nullable: true })
  me(@Context('req') request: FastifyRequest): Promise<User | undefined> {
    const token = request.cookies?.[this.cookie.token];
    if (token === undefined) {
      return Promise.resolve(undefined);
    }
    return this.auth.userFromToken(token);
  }

  // Caller's own Pl@ntNet key (empty clears it), so their identifications run
  // on their own 500/day quota. Stored server-side, never read back.
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
