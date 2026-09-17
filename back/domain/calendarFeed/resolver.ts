import { UseGuards } from '@nestjs/common';
import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { User } from '../user/model';
import { CalendarFeedTokenRepository } from './token-repository';

@Resolver()
export class CalendarFeedResolver {
  constructor(private readonly tokens: CalendarFeedTokenRepository) {}

  @Query(() => String)
  @UseGuards(AuthGuard)
  calendarFeedToken(@CurrentUser() user: User): Promise<string> {
    return this.tokens.tokenFor(user.id);
  }

  // Rotates the token, revoking any calendar already subscribed to the
  // previous link.
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  regenerateCalendarFeedToken(@CurrentUser() user: User): Promise<string> {
    return this.tokens.regenerate(user.id);
  }
}
