import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { Plant } from '../model';
import { PlantsArgs } from './args';
import { PlantFacets } from './facets';
import { PlantPage } from './page';
import { ListRepository } from './repository';

@Resolver(() => Plant)
export class ListResolver {
  constructor(
    private readonly repository: ListRepository,
    private readonly storage: FileStorageService,
  ) {}

  @Query(() => PlantPage)
  @UseGuards(AuthGuard)
  plants(
    @CurrentUser() user: User,
    @Args() args: PlantsArgs,
  ): Promise<PlantPage> {
    return this.repository.findPage(user.id, args);
  }

  @Query(() => PlantFacets)
  @UseGuards(AuthGuard)
  plantFacets(
    @CurrentUser() user: User,
    @Args() args: PlantsArgs,
  ): Promise<PlantFacets> {
    return this.repository.facets(user.id, args);
  }

  @ResolveField(() => String, { nullable: true })
  imageUrl(@Parent() plant: Plant): Promise<string | null> {
    if (plant.imageKey === null || plant.imageKey === undefined) {
      return Promise.resolve(null);
    }
    return this.storage.getSignedUrl(plant.imageKey);
  }
}
