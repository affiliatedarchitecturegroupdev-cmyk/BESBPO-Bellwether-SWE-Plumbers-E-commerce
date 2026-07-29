import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  checks: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
  };
}

// Replaces render.yaml's previous stand-in (healthCheckPath: /v1/products)
// — that endpoint returning 200 only ever proved the HTTP server was
// responding, not that the database or Redis were actually reachable. A
// Postgres or Redis outage wouldn't have failed the old health check at
// all, which defeats the point of having one on a platform that depends
// on both for basically everything (orders, cart, the notifications
// queue).
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);

    return {
      status: database === 'ok' && redis === 'ok' ? 'ok' : 'degraded',
      checks: { database, redis },
    };
  }

  private async checkDatabase(): Promise<'ok' | 'error'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch (err) {
      this.logger.error(`Health check: database unreachable: ${err}`);
      return 'error';
    }
  }

  private async checkRedis(): Promise<'ok' | 'error'> {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      // REDIS_URL is a required env var in production (see
      // env.validation.ts) — this branch only matters for a local dev
      // environment that hasn't set it up, which shouldn't be reported as
      // a health-check failure.
      return 'ok';
    }

    // A short-lived client for this single check, not the shared
    // notifications queue connection — deliberately isolated so a health
    // check never risks interfering with BullMQ's own connection state.
    const client = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 2000, lazyConnect: true });
    try {
      await client.connect();
      await client.ping();
      return 'ok';
    } catch (err) {
      this.logger.error(`Health check: Redis unreachable: ${err}`);
      return 'error';
    } finally {
      client.disconnect();
    }
  }
}
