import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { NotificationChannel, RenderedNotification } from './notification-channel.interface';

// AWS SES, not a dedicated email-sending SaaS (Postmark, SendGrid, Resend)
// — the group already runs S3 in af-south-1 for the catalog (see
// docs/BSWE-ECOM-PRODUCTION-PLAN.md), so this is the same account, same
// region, no new vendor relationship, and SES is priced per-email rather
// than a monthly tier — the same cost-consciousness behind the Postgres
// full-text search and no-CMS decisions earlier in this build.
@Injectable()
export class SesNotificationChannel implements NotificationChannel {
  private readonly logger = new Logger(SesNotificationChannel.name);
  private readonly client: SESClient;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    this.client = new SESClient({ region: this.config.get<string>('AWS_SES_REGION') ?? 'af-south-1' });
    this.fromAddress = this.config.get<string>('NOTIFICATIONS_FROM_ADDRESS') ?? 'orders@bellwetherswe.shop';
  }

  async send(notification: RenderedNotification): Promise<void> {
    const command = new SendEmailCommand({
      Source: this.fromAddress,
      Destination: { ToAddresses: [notification.recipientEmail] },
      Message: {
        Subject: { Data: notification.subject, Charset: 'UTF-8' },
        Body: { Text: { Data: notification.body, Charset: 'UTF-8' } },
      },
    });

    try {
      await this.client.send(command);
    } catch (err) {
      // Re-thrown, not swallowed — BullMQ's retry/backoff (configured on
      // the queue in notifications.service.ts) is what should handle a
      // transient SES failure, not this channel silently pretending it
      // succeeded.
      this.logger.error(`SES send failed for ${notification.recipientEmail}: ${err}`);
      throw err;
    }
  }
}
