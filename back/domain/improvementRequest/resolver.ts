import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '../auth/currentUser/guard';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AdminGuard } from '../bugReport/guard';
import { User } from '../user/model';
import { ImprovementStatusInput, RequestImprovementInput } from './input';
import { ImprovementRequestMapper } from './mapper';
import { ImprovementRequest } from './model';
import { ImprovementRequestRepository } from './repository';
import { ImprovementRequestService } from './service';
import type { RequestWithRequester } from './type';

@Resolver(() => ImprovementRequest)
export class ImprovementRequestResolver {
  constructor(
    private readonly service: ImprovementRequestService,
    private readonly requests: ImprovementRequestRepository,
    private readonly mapper: ImprovementRequestMapper,
  ) {}

  // Signed in, but nothing more: anybody using the site may ask for something,
  // and asking for a right first would silence exactly the ideas worth having.
  @Mutation(() => ImprovementRequest, {
    description: 'Suggests an improvement to the site.',
  })
  @UseGuards(AuthGuard)
  async requestImprovement(
    @CurrentUser() user: User,
    @Args('input') input: RequestImprovementInput,
  ): Promise<ImprovementRequest> {
    const record = await this.service.request(user, input);

    return this.mapper.toModel(record, user.email);
  }

  // Reuses the same administrators as the reports screen — one guest list for
  // everything an admin reads. AuthGuard first: it is what puts the user on the
  // request for AdminGuard to read.
  @Query(() => [ImprovementRequest], {
    description: 'Every suggestion, newest first. Administrators only.',
  })
  @UseGuards(AuthGuard, AdminGuard)
  async improvementRequests(): Promise<ImprovementRequest[]> {
    const records = await this.requests.findAll();

    return records.map((record: RequestWithRequester): ImprovementRequest =>
      this.mapper.toModel(record, record.requesterEmail),
    );
  }

  @Mutation(() => ImprovementRequest, {
    nullable: true,
    description:
      'Moves a suggestion along its life. Null when there is no such suggestion.',
  })
  @UseGuards(AuthGuard, AdminGuard)
  async setImprovementStatus(
    @Args('input') input: ImprovementStatusInput,
  ): Promise<ImprovementRequest | undefined> {
    const record = await this.requests.setStatus(input.id, input.status);

    return record === undefined ? undefined : this.mapper.toModel(record, null);
  }
}
