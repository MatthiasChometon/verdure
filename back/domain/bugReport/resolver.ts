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

  // The screenshot is served by the API on the host the request came from — the
  // same rule the plant photos follow, so it loads over localhost and the LAN
  // alike, and a raw storage key never leaves the server. Null when unattached.
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

  // Asked by the front so it can hide a menu entry that would only ever fail.
  // Its own question rather than a field on the user: whether somebody may read
  // the reports is this slice's business, and the account model has no reason
  // to learn about it.
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

  // Acts on the account behind a report rather than on an account id: the list
  // is where a flood is seen, and a report is what you are looking at when you
  // decide to stop it.
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
