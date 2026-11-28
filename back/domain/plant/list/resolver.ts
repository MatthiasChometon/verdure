import { UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type { FastifyRequest } from 'fastify';
import { ImageUrl } from '../../../infrastructure/file-storage/image-url';
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
    private readonly imageUrls: ImageUrl,
  ) {}

  @Query(() => PlantPage)
  @UseGuards(AuthGuard)
  plants(
    @CurrentUser() user: User,
    @Args() args: PlantsArgs,
  ): Promise<PlantPage> {
    return this.repository.findPage(user.id, args);
  }

  // Plants to water today (or overdue), for the "today" band on the home page.
  @Query(() => [Plant])
  @UseGuards(AuthGuard)
  plantsDue(@CurrentUser() user: User): Promise<Plant[]> {
    return this.repository.findDue(user.id);
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
  imageUrl(
    @Parent() plant: Plant,
    @Context() context: { req: FastifyRequest },
  ): string | null {
    return this.imageUrls.for(plant.imageKey, context.req);
  }
}
