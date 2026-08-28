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
  constructor(private readonly repository: ListRepository) {}

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

  // The image is served by the API on the same host the request came from, so
  // it loads over localhost and the LAN (phone) alike — no direct object-store
  // access, no extra port to open.
  @ResolveField(() => String, { nullable: true })
  imageUrl(
    @Parent() plant: Plant,
    @Context() context: { req: FastifyRequest },
  ): string | null {
    if (plant.imageKey === null || plant.imageKey === undefined) {
      return null;
    }
    const { req } = context;
    return `${req.protocol}://${req.headers.host}/images/${plant.imageKey}`;
  }
}
