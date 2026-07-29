import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';

const mockAdd = jest.fn();
const mockClose = jest.fn();

// NotificationsService constructs its own Queue internally (see the class
// comment on why: it's the producer half of a deliberately split
// producer/consumer setup) rather than receiving one via DI — so it's
// mocked at the module level instead of via a provider substitution.
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: mockAdd, close: mockClose })),
}));

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    mockAdd.mockClear();
    mockClose.mockClear();
    mockAdd.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: ConfigService, useValue: { get: () => 'redis://localhost:6379' } },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('queues an order.confirmed job with the given payload', async () => {
    await service.queueOrderConfirmed({
      recipientEmail: 'buyer@example.com',
      orderNumber: 'BSWE-1',
      total: '150.00',
    });

    expect(mockAdd).toHaveBeenCalledWith(
      'order.confirmed',
      expect.objectContaining({ type: 'order.confirmed', orderNumber: 'BSWE-1' }),
      expect.objectContaining({ attempts: 5 }),
    );
  });

  it('queues a warranty.issued job with the given payload', async () => {
    await service.queueWarrantyIssued({
      recipientEmail: 'buyer@example.com',
      warrantyId: 'w-1',
      termMonths: 12,
      expiresAt: '2027-01-01T00:00:00.000Z',
    });

    expect(mockAdd).toHaveBeenCalledWith(
      'warranty.issued',
      expect.objectContaining({ type: 'warranty.issued', warrantyId: 'w-1' }),
      expect.anything(),
    );
  });

  it('does not throw when the queue add fails — a queue outage must not fail the calling request', async () => {
    mockAdd.mockRejectedValueOnce(new Error('Redis unreachable'));

    await expect(
      service.queueOrderConfirmed({ recipientEmail: 'buyer@example.com', orderNumber: 'BSWE-1', total: '150.00' }),
    ).resolves.not.toThrow();
  });

  it('closes the underlying queue connection on module destroy', async () => {
    await service.onModuleDestroy();
    expect(mockClose).toHaveBeenCalled();
  });
});
