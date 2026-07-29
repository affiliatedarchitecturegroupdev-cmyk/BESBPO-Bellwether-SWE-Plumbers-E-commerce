import { Module } from '@nestjs/common';
import { NotificationTemplatesController } from './notification-templates.controller';
import { NotificationTemplatesService } from './notification-templates.service';
import { PrismaModule } from '../../prisma/prisma.module';

// PrismaModule is @Global(), but that only makes its exports available
// throughout WHICHEVER application tree actually imports it somewhere —
// the worker process (worker.ts's own minimal WorkerModule) is a
// completely separate NestFactory.createApplicationContext() bootstrap
// from the API's AppModule, with its own DI container. Importing
// PrismaModule explicitly here, rather than assuming its globality
// reaches the worker for free, is what actually threads PrismaService
// into NotificationsWorkerModule's tree once THIS module gets imported
// there too.
@Module({
  imports: [PrismaModule],
  controllers: [NotificationTemplatesController],
  providers: [NotificationTemplatesService],
  exports: [NotificationTemplatesService],
})
export class NotificationTemplatesModule {}
