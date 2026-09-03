import { Module } from '@nestjs/common';
import { AdminNoticeModule } from '../adminNotice/module';
import { AuthModule } from '../auth/module';
import { BugReportModule } from '../bugReport/module';
import { ImprovementRequestEmailRenderer } from './email-renderer';
import { ImprovementRequestMapper } from './mapper';
import { ImprovementRequestRepository } from './repository';
import { ImprovementRequestResolver } from './resolver';
import { ImprovementRequestService } from './service';

// Leans on BugReportModule for the one thing the two share: who counts as an
// administrator (Admins + AdminGuard), and on AdminNoticeModule for the other
// thing they share: the rhythm behind an announcement. Everything about a
// suggestion — its table, its life, its screen, its wording — lives here.
@Module({
  imports: [AuthModule, BugReportModule, AdminNoticeModule],
  providers: [
    ImprovementRequestResolver,
    ImprovementRequestService,
    ImprovementRequestRepository,
    ImprovementRequestMapper,
    ImprovementRequestEmailRenderer,
  ],
})
export class ImprovementRequestModule {}
