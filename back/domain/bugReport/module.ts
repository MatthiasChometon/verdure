import { Module } from '@nestjs/common';
import { HttpInfrastructureModule } from '../../infrastructure/http/module';
import { AdminNoticeModule } from '../adminNotice/module';
import { AuthModule } from '../auth/module';
import { Admins } from './admins.service';
import { BugReportEmailRenderer } from './email-renderer';
import { AdminGuard } from './guard';
import { BugReportMapper } from './mapper';
import { BugReportRepository } from './repository';
import { BugReportResolver } from './resolver';
import { BugReportService } from './service';
import { BugImageUploadController } from './uploadImage/controller';

@Module({
  imports: [AuthModule, HttpInfrastructureModule, AdminNoticeModule],
  controllers: [BugImageUploadController],
  providers: [
    BugReportResolver,
    BugReportService,
    BugReportRepository,
    BugReportMapper,
    BugReportEmailRenderer,
    Admins,
    AdminGuard,
  ],
  // Shared with the improvement-request slice: one guest list decides who counts
  // as an administrator across every screen an admin reads.
  exports: [Admins, AdminGuard],
})
export class BugReportModule {}
