export const NOTIFICATION_CHANNEL = Symbol('NOTIFICATION_CHANNEL');

export interface RenderedNotification {
  recipientEmail: string;
  subject: string;
  body: string;
}

// One interface, swappable implementations — the processor doesn't know or
// care which channel is active, it just calls send(). See
// notifications.worker.module.ts for how the active implementation is
// selected via NOTIFICATION_CHANNEL.
export interface NotificationChannel {
  send(notification: RenderedNotification): Promise<void>;
}
