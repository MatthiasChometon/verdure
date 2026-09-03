import { Module } from '@nestjs/common';
import { AdminAnnouncer } from './announcer';

// The shared rhythm behind every "tell the administrators" round — bugReport
// and improvementRequest each import this for AdminAnnouncer, and keep their
// own wording, counting and log lines to themselves.
@Module({
  providers: [AdminAnnouncer],
  exports: [AdminAnnouncer],
})
export class AdminNoticeModule {}
