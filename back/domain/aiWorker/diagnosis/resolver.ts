import { NotFoundException, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { DiagnosisJob } from './model';
import { DiagnosisJobRepository } from './repository';

@Resolver()
export class DiagnosisResolver {
  constructor(private readonly jobs: DiagnosisJobRepository) {}

  // Returns the freshly-queued job so the app can start polling diagnosisJob straight away.
  @Mutation(() => DiagnosisJob)
  @UseGuards(AuthGuard)
  async diagnosePlant(
    @CurrentUser() user: User,
    @Args('plantId', { type: () => ID }, ParseUUIDPipe) plantId: string,
  ): Promise<DiagnosisJob> {
    const jobId = await this.jobs.enqueue(user.id, plantId);
    if (jobId === undefined) {
      throw new NotFoundException(
        'Plant not found, or it has no photo to diagnose.',
      );
    }
    const job = await this.jobs.findForUser(user.id, jobId);
    if (job === undefined) {
      throw new NotFoundException('Diagnosis job not found.');
    }
    return job;
  }

  @Query(() => DiagnosisJob)
  @UseGuards(AuthGuard)
  async diagnosisJob(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<DiagnosisJob> {
    const job = await this.jobs.findForUser(user.id, id);
    if (job === undefined) {
      throw new NotFoundException('Diagnosis job not found.');
    }
    return job;
  }
}
