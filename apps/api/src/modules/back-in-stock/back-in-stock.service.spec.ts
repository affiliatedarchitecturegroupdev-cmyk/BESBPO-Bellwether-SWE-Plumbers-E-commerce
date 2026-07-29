import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { BackInStockService } from './back-in-stock.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('BackInStockService', () => {
  let service: BackInStockService;
  let prisma: DeepMockProxy<PrismaService>;
  let notificationsService: { queueBackInStock: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    notificationsService = { queueBackInStock: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackInStockService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(BackInStockService);
  });

  describe('requestNotification', () => {
    it('throws NotFoundException for a product that does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.requestNotification('missing-id', 'buyer@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when the product is currently in stock — not a real request', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', stockQty: 5 } as never);
      await expect(service.requestNotification('prod-1', 'buyer@example.com')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.backInStockRequest.upsert).not.toHaveBeenCalled();
    });

    it('creates a new request for an out-of-stock product with no prior request', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', stockQty: 0 } as never);
      prisma.backInStockRequest.findUnique.mockResolvedValue(null);

      const result = await service.requestNotification('prod-1', 'Buyer@Example.com');

      expect(result.alreadyRequested).toBe(false);
      expect(prisma.backInStockRequest.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email_productId: { email: 'buyer@example.com', productId: 'prod-1' } },
          create: { email: 'buyer@example.com', productId: 'prod-1' },
        }),
      );
    });

    it('is idempotent — requesting again while already pending (not yet notified) is a quiet success, not a duplicate', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', stockQty: 0 } as never);
      prisma.backInStockRequest.findUnique.mockResolvedValue({
        email: 'buyer@example.com',
        productId: 'prod-1',
        notifiedAt: null,
      } as never);

      const result = await service.requestNotification('prod-1', 'buyer@example.com');

      expect(result.alreadyRequested).toBe(true);
      expect(prisma.backInStockRequest.upsert).not.toHaveBeenCalled();
    });

    it('re-arms an already-notified request (clears notifiedAt) rather than treating it as a duplicate', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', stockQty: 0 } as never);
      prisma.backInStockRequest.findUnique.mockResolvedValue({
        email: 'buyer@example.com',
        productId: 'prod-1',
        notifiedAt: new Date('2026-01-01'),
      } as never);

      const result = await service.requestNotification('prod-1', 'buyer@example.com');

      expect(result.alreadyRequested).toBe(false);
      expect(prisma.backInStockRequest.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { notifiedAt: null } }),
      );
    });
  });

  describe('notifyIfBackInStock', () => {
    it('does nothing when the product was already in stock — not a real 0-to-positive transition', async () => {
      await service.notifyIfBackInStock('prod-1', 5, 10);
      expect(prisma.backInStockRequest.findMany).not.toHaveBeenCalled();
    });

    it('does nothing when the new stock is still zero or less', async () => {
      await service.notifyIfBackInStock('prod-1', 0, 0);
      expect(prisma.backInStockRequest.findMany).not.toHaveBeenCalled();
    });

    it('does nothing when there are no pending requests for this product', async () => {
      prisma.backInStockRequest.findMany.mockResolvedValue([]);
      await service.notifyIfBackInStock('prod-1', 0, 10);
      expect(prisma.backInStockRequest.updateMany).not.toHaveBeenCalled();
      expect(notificationsService.queueBackInStock).not.toHaveBeenCalled();
    });

    it('marks every pending request notified AND queues a real notification per request, with the real product name/slug', async () => {
      prisma.backInStockRequest.findMany.mockResolvedValue([
        { email: 'buyer1@example.com', product: { name: 'Copper Pipe 15mm', slug: 'copper-pipe-15mm' } },
        { email: 'buyer2@example.com', product: { name: 'Copper Pipe 15mm', slug: 'copper-pipe-15mm' } },
      ] as never);

      await service.notifyIfBackInStock('prod-1', 0, 10);

      expect(prisma.backInStockRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { productId: 'prod-1', notifiedAt: null } }),
      );
      expect(notificationsService.queueBackInStock).toHaveBeenCalledTimes(2);
      expect(notificationsService.queueBackInStock).toHaveBeenCalledWith({
        recipientEmail: 'buyer1@example.com',
        productName: 'Copper Pipe 15mm',
        productSlug: 'copper-pipe-15mm',
      });
    });
  });
});
