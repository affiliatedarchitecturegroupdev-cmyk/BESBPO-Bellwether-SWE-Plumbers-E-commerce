import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DeepMockProxy } from 'jest-mock-extended';
import { CartAbandonmentService } from './cart-abandonment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('CartAbandonmentService', () => {
  let service: CartAbandonmentService;
  let prisma: DeepMockProxy<PrismaService>;
  let notificationsService: { queueCartAbandoned: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    notificationsService = { queueCartAbandoned: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartAbandonmentService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: ConfigService, useValue: { get: () => 'https://bellwetherswe.shop' } },
      ],
    }).compile();

    service = module.get(CartAbandonmentService);
  });

  it('does nothing at all when there are no candidate carts — no notification queued, no cart touched', async () => {
    prisma.cart.findMany.mockResolvedValue([]);

    await service.checkAbandonedCarts();

    expect(notificationsService.queueCartAbandoned).not.toHaveBeenCalled();
    expect(prisma.cart.update).not.toHaveBeenCalled();
  });

  it('queries only non-empty carts with no reminder already sent, within the 24h-7d window', async () => {
    prisma.cart.findMany.mockResolvedValue([]);

    await service.checkAbandonedCarts();

    const [call] = prisma.cart.findMany.mock.calls;
    expect(call[0].where).toEqual(
      expect.objectContaining({
        reminderSentAt: null,
        items: { some: {} },
        updatedAt: expect.objectContaining({ lte: expect.any(Date), gte: expect.any(Date) }),
      }),
    );
  });

  it('queues a reminder and marks the cart immediately for each candidate — not batched at the end', async () => {
    prisma.cart.findMany.mockResolvedValue([
      { id: 'cart-1', account: { email: 'buyer1@example.com' }, items: [{ id: 'ci-1' }, { id: 'ci-2' }] },
      { id: 'cart-2', account: { email: 'buyer2@example.com' }, items: [{ id: 'ci-3' }] },
    ] as never);

    await service.checkAbandonedCarts();

    expect(notificationsService.queueCartAbandoned).toHaveBeenCalledTimes(2);
    expect(notificationsService.queueCartAbandoned).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'buyer1@example.com',
        itemCount: 2,
        cartUrl: 'https://bellwetherswe.shop/cart',
      }),
    );
    expect(prisma.cart.update).toHaveBeenCalledWith({
      where: { id: 'cart-1' },
      data: { reminderSentAt: expect.any(Date) },
    });
    expect(prisma.cart.update).toHaveBeenCalledWith({
      where: { id: 'cart-2' },
      data: { reminderSentAt: expect.any(Date) },
    });
  });
});
