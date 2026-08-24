import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { BugReportModule } from '../bugReport/module';
import { ImprovementRequestRepository } from './repository';
import { ImprovementRequestResolver } from './resolver';
import { ImprovementRequestService } from './service';

// Leans on BugReportModule for the one thing the two share: who counts as an
// administrator (Admins + AdminGuard). Everything about a suggestion — its
// table, its life, its screen — lives here.
@Module({
  imports: [AuthModule, BugReportModule],
  providers: [
    ImprovementRequestResolver,
    ImprovementRequestService,
    ImprovementRequestRepository,
  ],
})
export class ImprovementRequestModule {}
