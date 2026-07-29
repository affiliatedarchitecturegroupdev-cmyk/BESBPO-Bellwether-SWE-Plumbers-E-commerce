import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TransformResponseInterceptor } from '../../src/common/interceptors/transform-response.interceptor';
import { LoggingInterceptor } from '../../src/common/interceptors/logging.interceptor';

// Deliberately mirrors main.ts's bootstrap() function line for line where
// it matters (versioning, global pipes/filters/interceptors) — an e2e test
// that skips these would be testing a different, friendlier app than the
// one that's actually deployed. If main.ts's global setup ever changes,
// this needs the matching change or e2e tests silently stop reflecting
// production behavior.
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformResponseInterceptor());

  await app.init();
  return app;
}
