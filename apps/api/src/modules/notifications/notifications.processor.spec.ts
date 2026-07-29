import { ConfigService } from '@nestjs/config';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationJob } from './interfaces/notification-job.interface';

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));

describe('NotificationsProcessor', () => {
  let processor: NotificationsProcessor;
  let channel: { send: jest.Mock };
  let smsService: { send: jest.Mock };
  let notificationTemplatesService: { render: jest.Mock };

  beforeEach(() => {
    channel = { send: jest.fn() };
    smsService = { send: jest.fn() };
    // A minimal, valid RenderedNotification — none of the existing tests
    // in this file assert on actual subject/body content, only on
    // whether channel.send/smsService.send were called, so the exact
    // rendered values here don't matter to them.
    notificationTemplatesService = {
      render: jest.fn().mockResolvedValue({ recipientEmail: 'buyer@example.com', subject: 'x', body: 'x' }),
    };
    const config = { get: () => undefined } as unknown as ConfigService;

    processor = new NotificationsProcessor(config, channel as never, smsService as never, notificationTemplatesService as never);
  });

  async function callProcess(data: NotificationJob) {
    await (processor as unknown as { process: (job: { data: NotificationJob }) => Promise<void> }).process({ data });
  }

  it('always sends via the email channel, regardless of notification type', async () => {
    await callProcess({ type: 'quote.priced' } as never);
    expect(channel.send).toHaveBeenCalledTimes(1);
  });

  it('delegates rendering to NotificationTemplatesService rather than rendering directly', async () => {
    const job = { type: 'quote.priced', recipientEmail: 'buyer@example.com' } as never;
    await callProcess(job);
    expect(notificationTemplatesService.render).toHaveBeenCalledWith(job);
    expect(channel.send).toHaveBeenCalledWith(
      expect.objectContaining({ recipientEmail: 'buyer@example.com', subject: 'x', body: 'x' }),
    );
  });

  it('attempts SMS for order.shipped when a phone number is present', async () => {
    await callProcess({
      type: 'order.shipped',
      recipientPhone: '0821234567',
      orderNumber: 'BSWE-1',
      trackingNumber: 'RAM123',
    } as never);

    expect(smsService.send).toHaveBeenCalledWith('0821234567', expect.stringContaining('BSWE-1'));
    expect(smsService.send).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('RAM123'));
  });

  it('does not attempt SMS for order.shipped when no phone number is on file', async () => {
    await callProcess({ type: 'order.shipped', recipientPhone: null, orderNumber: 'BSWE-1' } as never);
    expect(smsService.send).not.toHaveBeenCalled();
  });

  it('does not attempt SMS for any other notification type, even with a phone-like field present', async () => {
    await callProcess({ type: 'order.confirmed', recipientEmail: 'buyer@example.com' } as never);
    expect(smsService.send).not.toHaveBeenCalled();
  });

  it('still sends the email even when SMS fails — a failed SMS never blocks the job', async () => {
    smsService.send.mockResolvedValue(false);

    await expect(
      callProcess({ type: 'order.shipped', recipientPhone: '0821234567', orderNumber: 'BSWE-1' } as never),
    ).resolves.not.toThrow();
    expect(channel.send).toHaveBeenCalledTimes(1);
  });
});
