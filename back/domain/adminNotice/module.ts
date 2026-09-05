import { Module } from '@nestjs/common';
import { AdminAnnouncer } from './announcer';

// Shared "tell the administrators" rhythm; bugReport/improvementRequest keep their own wording/log lines.
@Module({
  providers: [AdminAnnouncer],
  exports: [AdminAnnouncer],
})
export class AdminNoticeModule {}
