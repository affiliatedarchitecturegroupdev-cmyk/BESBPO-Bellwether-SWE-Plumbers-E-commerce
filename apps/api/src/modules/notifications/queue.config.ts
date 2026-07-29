import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';

export const NOTIFICATIONS_QUEUE_NAME = 'notifications';

// Both apps/api's NotificationsService (producer, adds jobs to the queue)
// and worker.ts's processor (consumer, runs in a separate Render service —
// see render.yaml's bellwetherswe-worker) need to connect to the exact
// same Redis instance and queue name to see each other's jobs. This is the
// one place that connection config is built, so producer and consumer
// can't drift apart.
export function buildRedisConnectionOptions(config: ConfigService): RedisOptions {
  const redisUrl = config.get<string>('REDIS_URL');
  if (!redisUrl) {
    throw new Error('REDIS_URL is required for the notifications queue but was not configured');
  }

  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    // BullMQ's own requirement, not a style choice — its blocking commands
    // (used internally for job polling) are incompatible with ioredis's
    // default retry behavior otherwise.
    maxRetriesPerRequest: null,
  };
}
