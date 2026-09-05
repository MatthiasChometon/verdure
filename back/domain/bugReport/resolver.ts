import { NotFoundException, UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { User } from '../user/model';
import { Admins } from './admins.service';
import { AdminGuard } from './guard';
import { BlockReporterInput, BugStatusInput, ReportBugInput } from './input';
import { BugReportMapper } from './mapper';
import { BugReport } from './model';
import { BugReportRepository } from './repository';
import { BugReportService } from './service';
import type { ReportWithReporter } from './type';

@Resolver(() => BugReport)
export class BugReportResolver {
  constructor(
    private readonly service: BugReportService,
    private readonly reports: BugReportRepository,
    private readonly admins: Admins,
    private readonly mapper: BugReportMapper,
  ) {}

  // Signed in, but nothing more: anybody using the site may say what is broken,
  // and asking for a right first would silence exactly the reports worth having.
  @Mutation(() => BugReport, {
    description: 'Reports a problem with the site.',
  })
  @UseGuards(AuthGuard)
  async reportBug(
    @CurrentUser() user: User,
    @Args('input') input: ReportBugInput,
  ): Promise<BugReport> {
    const record = await this.service.report(user, input);

    return this.mapper.toModel(record, user.email);
  }

  // Served by the API on the request's own host (loads over localhost/LAN
  // alike, same rule as plant photos), so the raw storage key never leaks.
  @ResolveField(() => String, { nullable: true })
  imageUrl(
    @Parent() report: BugReport,
    @Context() context: { req: FastifyRequest },
  ): string | null {
    if (report.imageKey === null) {
      return null;
    }
    const { req } = context;
    return `${req.protocol}://${req.headers.host}/images/${report.imageKey}`;
  }

  // Lets the front hide a menu entry that would only fail. Kept out of the user
  // model — whether an account may read reports is this slice's business.
  @Query(() => Boolean, {
    description: 'Whether the signed-in account may read the reports.',
  })
  @UseGuards(AuthGuard)
  amIAdmin(@CurrentUser() user: User): boolean {
    return this.admins.has(user.email);
  }

  // AuthGuard first: it is what puts the user on the request for AdminGuard to
  // read. Reversed, the second guard would find nobody and refuse everyone.
  @Query(() => [BugReport], {
    description: 'Every report, newest first. Administrators only.',
  })
  @UseGuards(AuthGuard, AdminGuard)
  async bugReports(): Promise<BugReport[]> {
    const records = await this.reports.findAll();

    return records.map((record: ReportWithReporter): BugReport =>
      this.mapper.toModel(record, record.reporterEmail, record.reporterBlocked),
    );
  }

  // Acts on the account behind a report, not a raw account id — a report is
  // what you're looking at when you decide to block someone.
  @Mutation(() => Boolean, {
    description: 'Stops, or resumes, reports from the account behind a report.',
  })
  @UseGuards(AuthGuard, AdminGuard)
  async blockReporter(
    @Args('input') input: BlockReporterInput,
  ): Promise<boolean> {
    const userId = await this.reports.reporterOf(input.reportId);
    if (userId === undefined) throw new NotFoundException('No such report.');

    // The account has been closed since: there is nobody left to block, and
    // saying so is more useful than pretending it worked.
    if (userId === null)
      throw new NotFoundException('That account no longer exists.');

    await this.reports.setBlocked(userId, input.blocked);

    return input.blocked;
  }

  @Mutation(() => BugReport, {
    nullable: true,
    description:
      'Marks a report as handled. Null when there is no such report.',
  })
  @UseGuards(AuthGuard, AdminGuard)
  async setBugStatus(
    @Args('input') input: BugStatusInput,
  ): Promise<BugReport | undefined> {
    const record = await this.reports.setStatus(input.id, input.status);

    return record === undefined ? undefined : this.mapper.toModel(record, null);
  }
}
