import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { WorkerTokenRepository } from '../token/repository';
import { PairingRequest } from './model';
import { WorkerPairingRepository } from './repository';

@Resolver()
export class WorkerPairingResolver {
  constructor(
    private readonly pairings: WorkerPairingRepository,
    private readonly tokens: WorkerTokenRepository,
  ) {}

  // What the approval screen shows: the device waiting behind this code, or null
  // if the code is unknown or already expired/handled.
  @Query(() => PairingRequest, { nullable: true })
  @UseGuards(AuthGuard)
  async pendingPairing(
    @Args('code') code: string,
  ): Promise<PairingRequest | null> {
    return (await this.pairings.pendingByCode(code)) ?? null;
  }

  // Approve a device: mint a worker token for the current user and hand it to the
  // pairing so the worker collects it on its next poll.
  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async approvePairing(
    @CurrentUser() user: User,
    @Args('code') code: string,
  ): Promise<boolean> {
    const pending = await this.pairings.pendingByCode(code);
    if (pending === undefined) {
      return false;
    }
    const issued = await this.tokens.issue(user.id, pending.label ?? undefined);
    return this.pairings.approve(code, user.id, issued.token);
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  denyPairing(@Args('code') code: string): Promise<boolean> {
    return this.pairings.deny(code);
  }
}
