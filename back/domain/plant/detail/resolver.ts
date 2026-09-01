import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { Plant } from '../model';
import { SaveRepository } from '../save/repository';
import { WateringEvent } from '../watering/event.model';
import { WateringRepository } from '../watering/repository';

// The detail page's hub query: one plant with everything its page shows. Reuses
// the existing repositories (find by id, watering journal) rather than a new one.
@Resolver(() => Plant)
export class DetailResolver {
  constructor(
    private readonly plants: SaveRepository,
    private readonly watering: WateringRepository,
  ) {}

  @Query(() => Plant, { nullable: true })
  @UseGuards(AuthGuard)
  async plant(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<Plant | null> {
    const found = await this.plants.findById(user.id, id);
    return found ?? null;
  }

  // The plant's full watering journal, most recent first. Resolved on demand, so
  // the list/collection queries — which never select it — pay nothing for it.
  @ResolveField(() => [WateringEvent])
  wateringHistory(@Parent() plant: Plant): Promise<WateringEvent[]> {
    return this.watering.historyOf(plant.id);
  }
}
