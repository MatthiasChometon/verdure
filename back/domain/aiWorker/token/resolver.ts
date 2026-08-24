import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { IssuedWorkerToken, WorkerToken } from './model';
import { WorkerTokenRepository } from './repository';

@Resolver()
export class WorkerTokenResolver {
  constructor(private readonly repository: WorkerTokenRepository) {}

  @Query(() => [WorkerToken])
  @UseGuards(AuthGuard)
  workerTokens(@CurrentUser() user: User): Promise<WorkerToken[]> {
    return this.repository.listByUser(user.id);
  }

  // Mint a worker token for the current user. The plaintext is returned once,
  // to paste into the worker installer.
  @Mutation(() => IssuedWorkerToken)
  @UseGuards(AuthGuard)
  createWorkerToken(
    @CurrentUser() user: User,
    @Args('label', { type: () => String, nullable: true }) label?: string,
  ): Promise<IssuedWorkerToken> {
    return this.repository.issue(user.id, label);
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  revokeWorkerToken(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<boolean> {
    return this.repository.revoke(user.id, id);
  }
}
