import { NotFoundException, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { WorkerTokenRepository } from '../token/repository';
import { RecognitionJob } from './model';
import { RecognitionJobRepository } from './repository';

@Resolver()
export class RecognitionJobResolver {
  constructor(
    private readonly jobs: RecognitionJobRepository,
    private readonly workers: WorkerTokenRepository,
  ) {}

  // Does the current user have a worker connected right now? Drives whether the
  // app shows "analysing…" or the "activate your AI" guide.
  @Query(() => Boolean)
  @UseGuards(AuthGuard)
  aiWorkerOnline(@CurrentUser() user: User): Promise<boolean> {
    return this.workers.isOnline(user.id);
  }

  @Query(() => RecognitionJob)
  @UseGuards(AuthGuard)
  async identificationJob(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<RecognitionJob> {
    const job = await this.jobs.findForUser(user.id, id);
    if (job === undefined) {
      throw new NotFoundException('Recognition job not found.');
    }
    return job;
  }
}
