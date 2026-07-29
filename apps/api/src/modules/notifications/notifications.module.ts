import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

// Deliberately does NOT include NotificationsProcessor — see the class
// comment on NotificationsService for why the API process must never
// consume jobs, only produce them. worker.ts imports
// NotificationsWorkerModule instead, which is where the processor lives.
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
