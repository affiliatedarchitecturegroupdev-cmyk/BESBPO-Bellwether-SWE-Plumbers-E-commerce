import './instrument';
import { NestFactory } from '@nestjs/core';
import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsWorkerModule } from './modules/notifications/notifications-worker.module';
import { envValidationSchema } from './config/env.validation';

// Deliberately NOT the full AppModule — a worker process has no HTTP
// routes, no controllers, no auth guards, none of that. It only needs
// config and whichever *Worker modules exist (today: just notifications).
// Keeping this minimal is what makes it a genuinely separate, independently
// scalable process rather than the API process wearing two hats.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    NotificationsWorkerModule,
  ],
})
class WorkerModule {}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Worker');
  // createApplicationContext, not create() — no HTTP server, no port to
  // bind. This process's only job is running BullMQ's Worker (started in
  // NotificationsProcessor's constructor as soon as it's instantiated),
  // which polls Redis directly and needs nothing from Nest's HTTP layer.
  await NestFactory.createApplicationContext(WorkerModule);
  logger.log('Worker process started — processing the notifications queue.');
}

bootstrap();
