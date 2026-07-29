import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { QuotesService } from './quotes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('QuotesService', () => {
  let service: QuotesService;
  let prisma: DeepMockProxy<PrismaService>;
  let notificationsService: { queueQuotePriced: jest.Mock };
  let auditLogService: { record: jest.Mock };

  const mockAccount = { id: 'acc-1', keycloakSub: 'sub-1', email: 'buyer@example.com' };

  beforeEach(async () => {
    prisma = createPrismaMock();
    notificationsService = { queueQuotePriced: jest.fn() };
    auditLogService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: { resolveOrCreate: jest.fn().mockResolvedValue(mockAccount) } },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(QuotesService);
  });

  describe('create', () => {
    it('throws BadRequestException when a referenced product does not exist', async () => {
      prisma.product.count.mockResolvedValue(0); // caller referenced 1 product, none found

      await expect(
        service.create('sub-1', 'buyer@example.com', {
          description: 'Bulk order for a renovation project',
          items: [{ productId: 'missing-product', description: 'Copper pipe', quantity: 50 }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.quote.create).not.toHaveBeenCalled();
    });

    it('allows an entirely custom line item with no productId at all', async () => {
      prisma.quote.create.mockResolvedValue({ id: 'quote-1' } as never);

      await service.create('sub-1', 'buyer@example.com', {
        description: 'Custom on-site labour quote',
        items: [{ description: 'On-site labour, 2 days', quantity: 2 }],
      });

      expect(prisma.product.count).not.toHaveBeenCalled(); // no productIds to validate at all
      expect(prisma.quote.create).toHaveBeenCalled();
    });
  });

  describe('priceQuote', () => {
    const actorEmail = 'admin@bellwetherswe.co.za';
    const priceDto = {
      itemPrices: [{ itemId: 'item-1', unitPrice: 45 }],
      quotedTotal: 4500,
      validUntil: '2026-12-31',
    };

    it('throws NotFoundException when the quote does not exist', async () => {
      prisma.quote.findUnique.mockResolvedValue(null);
      await expect(service.priceQuote('missing', priceDto, actorEmail)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException once a quote has already been accepted or declined', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: 'quote-1',
        status: 'ACCEPTED',
        items: [{ id: 'item-1' }],
        account: { email: 'buyer@example.com' },
      } as never);

      await expect(service.priceQuote('quote-1', priceDto, actorEmail)).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when a priced item does not belong to this quote', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: 'quote-1',
        status: 'REQUESTED',
        items: [{ id: 'a-different-item' }], // item-1 (from priceDto) isn't in this list
        account: { email: 'buyer@example.com' },
      } as never);

      await expect(service.priceQuote('quote-1', priceDto, actorEmail)).rejects.toThrow(BadRequestException);
    });

    it('prices the quote, queues a notification, and records an audit entry', async () => {
      prisma.quote.findUnique.mockResolvedValueOnce({
        id: 'quote-1',
        status: 'REQUESTED',
        items: [{ id: 'item-1' }],
        account: { email: 'buyer@example.com' },
      } as never);
      // findOneAdmin's own lookup at the end of priceQuote
      prisma.quote.findUnique.mockResolvedValueOnce({ id: 'quote-1', status: 'QUOTED' } as never);

      await service.priceQuote('quote-1', priceDto, actorEmail);

      expect(notificationsService.queueQuotePriced).toHaveBeenCalledWith(
        expect.objectContaining({ recipientEmail: 'buyer@example.com', quotedTotal: '4500.00' }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorEmail, action: 'quote.priced', targetId: 'quote-1' }),
      );
    });
  });

  describe('respondToQuote', () => {
    it('throws ConflictException when the quote is not awaiting a response', async () => {
      prisma.quote.findUnique.mockResolvedValue({ id: 'quote-1', accountId: 'acc-1', status: 'REQUESTED' } as never);

      await expect(
        service.respondToQuote('sub-1', 'buyer@example.com', 'quote-1', { response: 'ACCEPTED' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when the quote has expired', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      prisma.quote.findUnique.mockResolvedValue({
        id: 'quote-1',
        accountId: 'acc-1',
        status: 'QUOTED',
        validUntil: yesterday,
      } as never);

      await expect(
        service.respondToQuote('sub-1', 'buyer@example.com', 'quote-1', { response: 'ACCEPTED' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException when the quote belongs to a different account', async () => {
      prisma.quote.findUnique.mockResolvedValue({ id: 'quote-1', accountId: 'someone-else', status: 'QUOTED' } as never);

      await expect(
        service.respondToQuote('sub-1', 'buyer@example.com', 'quote-1', { response: 'ACCEPTED' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('records an audit entry attributed to the customer, not an admin, on acceptance', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      prisma.quote.findUnique.mockResolvedValue({
        id: 'quote-1',
        accountId: 'acc-1',
        status: 'QUOTED',
        validUntil: tomorrow,
        quotedTotal: { toString: () => '4500' },
      } as never);
      prisma.quote.update.mockResolvedValue({ id: 'quote-1', status: 'ACCEPTED' } as never);

      await service.respondToQuote('sub-1', 'buyer@example.com', 'quote-1', { response: 'ACCEPTED' });

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorEmail: 'buyer@example.com', action: 'quote.accepted_by_customer' }),
      );
    });
  });

  describe('convertToOrder', () => {
    const actorEmail = 'admin@bellwetherswe.co.za';
    const shippingAddress = { line1: '1 Main Rd', city: 'Durban', province: 'KZN', postalCode: '4001' };

    it('throws ConflictException when the quote is not ACCEPTED', async () => {
      prisma.quote.findUnique.mockResolvedValue({ id: 'quote-1', status: 'QUOTED', orderId: null, items: [] } as never);

      await expect(
        service.convertToOrder('quote-1', { shippingAddress }, actorEmail),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when the quote has already been converted', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: 'quote-1',
        status: 'ACCEPTED',
        orderId: 'existing-order-1',
        items: [],
      } as never);

      await expect(
        service.convertToOrder('quote-1', { shippingAddress }, actorEmail),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException, naming the offending item, when any line has no catalog product', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: 'quote-1',
        status: 'ACCEPTED',
        orderId: null,
        account: { email: 'buyer@example.com' },
        items: [
          { id: 'item-1', productId: 'prod-1', description: 'Copper pipe', quantity: 10, unitPrice: 50 },
          { id: 'item-2', productId: null, description: 'On-site labour, 2 days', quantity: 1, unitPrice: 2000 },
        ],
      } as never);

      await expect(service.convertToOrder('quote-1', { shippingAddress }, actorEmail)).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.convertToOrder('quote-1', { shippingAddress }, actorEmail),
      ).rejects.toThrow(/On-site labour, 2 days/);
    });

    it('throws ConflictException, not creating an order, when stock is insufficient', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: 'quote-1',
        status: 'ACCEPTED',
        orderId: null,
        account: { email: 'buyer@example.com' },
        items: [{ id: 'item-1', productId: 'prod-1', description: 'Copper pipe', quantity: 500, unitPrice: 50 }],
      } as never);
      prisma.product.updateMany.mockResolvedValue({ count: 0 } as never);

      await expect(
        service.convertToOrder('quote-1', { shippingAddress }, actorEmail),
      ).rejects.toThrow(ConflictException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('backs VAT out of the VAT-inclusive quoted price, rather than adding it on top', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: 'quote-1',
        status: 'ACCEPTED',
        orderId: null,
        accountId: 'acc-1',
        account: { email: 'buyer@example.com' },
        items: [{ id: 'item-1', productId: 'prod-1', description: 'Copper pipe', quantity: 10, unitPrice: 115 }],
      } as never);
      prisma.product.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1', name: 'Copper Pipe 15mm' }] as never);
      prisma.order.create.mockResolvedValue({ id: 'order-1', orderNumber: 'BSWE-1', total: 1150 } as never);

      await service.convertToOrder('quote-1', { shippingAddress }, actorEmail);

      // 10 * R115 = R1150 total, VAT-inclusive. At 15% VAT, the
      // VAT-exclusive subtotal is 1150 / 1.15 = 1000.00 exactly.
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subtotal: 1000, total: 1150, status: 'CONFIRMED' }),
        }),
      );
    });

    it('links the quote to the created order and records an audit entry', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: 'quote-1',
        status: 'ACCEPTED',
        orderId: null,
        accountId: 'acc-1',
        account: { email: 'buyer@example.com' },
        items: [{ id: 'item-1', productId: 'prod-1', description: 'Copper pipe', quantity: 1, unitPrice: 115 }],
      } as never);
      prisma.product.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1', name: 'Copper Pipe 15mm' }] as never);
      prisma.order.create.mockResolvedValue({ id: 'order-1', orderNumber: 'BSWE-1', total: 115 } as never);

      await service.convertToOrder('quote-1', { shippingAddress }, actorEmail);

      expect(prisma.quote.update).toHaveBeenCalledWith({ where: { id: 'quote-1' }, data: { orderId: 'order-1' } });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorEmail, action: 'quote.converted_to_order', targetId: 'quote-1' }),
      );
    });
  });
});
