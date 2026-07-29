import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { NOTIFICATIONS_QUEUE_NAME, buildRedisConnectionOptions } from './queue.config';
import { NotificationJob } from './interfaces/notification-job.interface';
import { NOTIFICATION_CHANNEL, NotificationChannel } from './channels/notification-channel.interface';
import { SmsService } from './channels/sms.service';
import { NotificationTemplatesService } from './templates/notification-templates.service';
import { Sentry } from '../../instrument';

@Injectable()
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly worker: Worker<NotificationJob>;

  constructor(
    config: ConfigService,
    @Inject(NOTIFICATION_CHANNEL) private readonly channel: NotificationChannel,
    private readonly smsService: SmsService,
    private readonly notificationTemplatesService: NotificationTemplatesService,
  ) {
    this.worker = new Worker<NotificationJob>(
      NOTIFICATIONS_QUEUE_NAME,
      (job) => this.process(job),
      { connection: buildRedisConnectionOptions(config), concurrency: 5 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Notification job ${job?.id} (${job?.name}) failed: ${err.message}`);
      Sentry.captureException(err, { tags: { jobType: job?.name } });
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }

  private async process(job: Job<NotificationJob>): Promise<void> {
    const rendered = await this.notificationTemplatesService.render(job.data);
    await this.channel.send(rendered);
    await this.sendSmsIfApplicable(job.data);
  }

  // SMS is a best-effort ADDITION alongside email, not a channel swap —
  // email always sends regardless of what happens here. Deliberately
  // narrow for this pass: only order.shipped triggers an SMS attempt
  // (tracking updates are exactly the kind of thing worth an SMS ping;
  // see docs/AGENTS.md's SMS section for why this wasn't wired into
  // every notification type). A failed or skipped SMS never affects the
  // job's own success — SmsService.send already returns false rather
  // than throwing, so there's nothing here to catch.
  private async sendSmsIfApplicable(job: NotificationJob): Promise<void> {
    if (job.type !== 'order.shipped' || !job.recipientPhone) return;

    const trackingPart = job.trackingNumber ? ` Tracking: ${job.trackingNumber}.` : '';
    await this.smsService.send(
      job.recipientPhone,
      `Bellwether SWE: order ${job.orderNumber} has shipped.${trackingPart}`,
    );
  }
}
