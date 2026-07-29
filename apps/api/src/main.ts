import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: {
      // Only the storefront and internal tooling should call this API directly;
      // the AI service reaches it over Render's private network, not CORS.
      origin: [
        'https://bellwetherswe.shop',
        'https://www.bellwetherswe.shop',
        ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : []),
      ],
      credentials: true,
    },
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Render (and most PaaS hosts) terminate TLS and proxy requests to this
  // service — without trust proxy enabled, Express's req.ip reports the
  // proxy's address, not the real client's. PaymentsController's PayFast
  // ITN handler depends on req.ip being the actual caller for its
  // source-IP check; without this line that check would validate the
  // wrong address on every deploy.
  app.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not declared on the DTO
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformResponseInterceptor());

  // Schema is inferred from the existing class-validator decorators on
  // every DTO via the @nestjs/swagger CLI plugin (see nest-cli.json) —
  // deliberately not hand-annotated with @ApiProperty() across 20+
  // modules, which would be a much larger, separate effort for
  // marginal accuracy gain over what the plugin already infers from
  // real TypeScript types and validation rules. Docs won't have prose
  // descriptions per field, but every path, method, DTO shape, and auth
  // requirement is real and generated from the actual code, not
  // hand-maintained and liable to drift from it.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Bellwether SWE API')
    .setDescription('Bellwether SWE Plumbers e-commerce platform API')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'besbpo-id')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);
}

bootstrap();
