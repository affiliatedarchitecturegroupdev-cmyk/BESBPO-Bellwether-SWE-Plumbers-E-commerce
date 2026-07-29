import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsProcessor } from './notifications.processor';
import { NOTIFICATION_CHANNEL } from './channels/notification-channel.interface';
import { LogNotificationChannel } from './channels/log-notification.channel';
import { SesNotificationChannel } from './channels/ses-notification.channel';
import { SmsService } from './channels/sms.service';
import { NotificationTemplatesModule } from './templates/notification-templates.module';

// Channel selection happens once, here, via NOTIFICATION_CHANNEL — 'log'
// (the default, zero-cost, always works) or 'ses' (real email, needs AWS
// credentials configured on this service). Nothing downstream of this
// provider needs to know which one is active; NotificationsProcessor only
// ever depends on the NotificationChannel interface.
//
// SmsService is a separate, additional dimension, not a third channel
// choice — it's attempted alongside whichever email channel is active
// (currently only for order.shipped; see NotificationsProcessor), not
// instead of it. Same graceful-degradation shape either way: unconfigured
// means it quietly does nothing, not a startup failure.
@Module({
  imports: [NotificationTemplatesModule],
  providers: [
    NotificationsProcessor,
    SmsService,
    {
      provide: NOTIFICATION_CHANNEL,
      useFactory: (config: ConfigService) => {
        const channelType = config.get<string>('NOTIFICATION_CHANNEL') ?? 'log';
        return channelType === 'ses' ? new SesNotificationChannel(config) : new LogNotificationChannel();
      },
      inject: [ConfigService],
    },
  ],
})
export class NotificationsWorkerModule {}
