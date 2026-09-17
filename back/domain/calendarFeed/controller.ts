import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { UserRepository } from '../user/repository';
import { CalendarFeedService } from './feed.service';
import { CalendarFeedTokenRepository } from './token-repository';

// Public route: the token is the sole gate (no session cookie — calendar
// apps fetch this on their own schedule, same shape as the file-storage
// image controller).
@Controller('calendar-feed')
export class CalendarFeedController {
  constructor(
    private readonly tokens: CalendarFeedTokenRepository,
    private readonly feed: CalendarFeedService,
    private readonly users: UserRepository,
  ) {}

  @Get(':token')
  async feedIcs(
    @Param('token') token: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const userId = await this.tokens.userIdFor(token);
    if (userId === undefined) {
      throw new NotFoundException();
    }
    const locale = await this.users.localeOf(userId);
    const ics = await this.feed.icsFor(userId, locale);
    reply
      .header('Content-Type', 'text/calendar; charset=utf-8')
      // Recomputed live from the DB on every fetch — never cached.
      .header('Cache-Control', 'no-store')
      .send(ics);
  }
}
