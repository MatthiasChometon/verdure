import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { Plant } from '../model';
import { WateringEventsArgs } from './args';
import { WateringDefault } from './default.model';
import { WateringEvent } from './event.model';
import { WaterPlantInput } from './input';
import { WateringRepository } from './repository';

@Resolver()
export class WateringResolver {
  constructor(private readonly repository: WateringRepository) {}

  @Query(() => WateringDefault)
  @UseGuards(AuthGuard)
  wateringDefault(
    @Args('species', { type: () => String }) species: string,
  ): Promise<WateringDefault> {
    return this.repository.wateringDefault(species);
  }

  @Query(() => [WateringEvent])
  @UseGuards(AuthGuard)
  wateringEvents(
    @CurrentUser() user: User,
    @Args() args: WateringEventsArgs,
  ): Promise<WateringEvent[]> {
    return this.repository.wateringEvents(user.id, args.from, args.to);
  }

  @Mutation(() => Plant)
  @UseGuards(AuthGuard)
  waterPlant(
    @CurrentUser() user: User,
    @Args('input') input: WaterPlantInput,
  ): Promise<Plant> {
    return this.repository.water(user.id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  deleteWateringEvent(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<boolean> {
    return this.repository.removeWateringEvent(user.id, id);
  }
}
