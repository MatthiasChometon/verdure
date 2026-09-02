import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import {
  LogCareInput,
  RemoveCareScheduleInput,
  SetCareScheduleInput,
} from './input';
import { CareSchedule } from './model';
import { CareRepository } from './repository';

// Every operation is guarded to the signed-in user and scoped by their id in the
// repository, so no one can read or change another owner's care routines.
@Resolver()
export class CareResolver {
  constructor(private readonly repository: CareRepository) {}

  @Query(() => [CareSchedule])
  @UseGuards(AuthGuard)
  careSchedules(
    @CurrentUser() user: User,
    @Args('plantId', { type: () => ID }, ParseUUIDPipe) plantId: string,
  ): Promise<CareSchedule[]> {
    return this.repository.schedulesFor(user.id, plantId);
  }

  @Mutation(() => CareSchedule)
  @UseGuards(AuthGuard)
  setCareSchedule(
    @CurrentUser() user: User,
    @Args('input') input: SetCareScheduleInput,
  ): Promise<CareSchedule> {
    return this.repository.set(user.id, input);
  }

  @Mutation(() => CareSchedule)
  @UseGuards(AuthGuard)
  logCare(
    @CurrentUser() user: User,
    @Args('input') input: LogCareInput,
  ): Promise<CareSchedule> {
    return this.repository.logCare(user.id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  removeCareSchedule(
    @CurrentUser() user: User,
    @Args('input') input: RemoveCareScheduleInput,
  ): Promise<boolean> {
    return this.repository.remove(user.id, input);
  }
}
