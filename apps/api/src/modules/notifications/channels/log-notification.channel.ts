import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, RenderedNotification } from './notification-channel.interface';

// The default channel (NOTIFICATION_CHANNEL unset or 'log') — writes a
// structured log line instead of actually sending anything. This is not a
// stub waiting to be replaced before launch; it's a legitimate choice for
// any environment where no email provider is configured yet (local dev,
// CI, or production before SES credentials are set up), the same reasoning
// as the AI service's rule-based v1 search/recommendation logic. Swapping
// to SesNotificationChannel is a one-line config change, not a code change
// — see notifications.worker.module.ts.
@Injectable()
export class LogNotificationChannel implements NotificationChannel {
  private readonly logger = new Logger(LogNotificationChannel.name);

  async send(notification: RenderedNotification): Promise<void> {
    this.logger.log(
      `[notification] to=${notification.recipientEmail} subject="${notification.subject}"\n${notification.body}`,
    );
  }
}
