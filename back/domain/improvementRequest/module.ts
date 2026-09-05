import { Module } from '@nestjs/common';
import { AdminNoticeModule } from '../adminNotice/module';
import { AuthModule } from '../auth/module';
import { BugReportModule } from '../bugReport/module';
import { ImprovementRequestEmailRenderer } from './email-renderer';
import { ImprovementRequestMapper } from './mapper';
import { ImprovementRequestRepository } from './repository';
import { ImprovementRequestResolver } from './resolver';
import { ImprovementRequestService } from './service';

// Reuses BugReportModule's admin check and AdminNoticeModule's announce rhythm.
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
