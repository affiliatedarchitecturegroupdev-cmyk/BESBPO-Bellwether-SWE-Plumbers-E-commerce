import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

// Public, no auth — Render's health-check poller (and anyone debugging an
// outage) needs to reach this without a token. Uses @Res() directly to set
// a real 503 on a degraded check and to skip the global
// TransformResponseInterceptor's {data, meta} envelope — infra tooling
// wants a plain, predictable body here, not the app's general API shape.
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(@Res() res: Response): Promise<void> {
    const result = await this.healthService.check();
    const statusCode = result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(statusCode).json(result);
  }
}
