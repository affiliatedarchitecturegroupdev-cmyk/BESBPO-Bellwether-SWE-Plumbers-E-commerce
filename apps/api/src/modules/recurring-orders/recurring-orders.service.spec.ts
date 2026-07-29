import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { RecurringOrdersService } from './recurring-orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('RecurringOrdersService', () => {
  let service: RecurringOrdersService;
  let prisma: DeepMockProxy<PrismaService>;
  let accountsService: { resolveOrCreate: jest.Mock };
  let cartService: { bulkAddItems: jest.Mock };
  let ordersService: { checkout: jest.Mock };
  let notificationsService: { queueRecurringOrderPlaced: jest.Mock; queueRecurringOrderFailed: jest.Mock };

  const mockAccount = { id: 'acc-1', keycloakSub: 'sub-1', email: 'buyer@example.com' };
  const mockAddress = { line1: '1 Main Rd', city: 'Durban', province: 'KZN', postalCode: '4001' };

  beforeEach(async () => {
    prisma = createPrismaMock();
    accountsService = { resolveOrCreate: jest.fn().mockResolvedValue(mockAccount) };
    cartService = { bulkAddItems: jest.fn() };
    ordersService = { checkout: jest.fn() };
    notificationsService = { queueRecurringOrderPlaced: jest.fn(), queueRecurringOrderFailed: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringOrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: accountsService },
        { provide: CartService, useValue: cartService },
        { provide: OrdersService, useValue: ordersService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(RecurringOrdersService);
  });

  describe('create', () => {
    it('throws ForbiddenException when the account has no trade credit account at all', async () => {
      prisma.tradeCreditAccount.findUnique.mockResolvedValue(null);

      await expect(
        service.create('sub-1', 'buyer@example.com', {
          name: 'Monthly consumables',
          frequency: 'MONTHLY' as never,
          shippingAddress: mockAddress,
          items: [{ productId: 'prod-1', quantity: 2 }],
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.recurringOrderTemplate.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when trade credit exists but is not yet approved', async () => {
      prisma.tradeCreditAccount.findUnique.mockResolvedValue({ id: 'tca-1', approvedAt: null } as never);

      await expect(
        service.create('sub-1', 'buyer@example.com', {
          name: 'Monthly consumables',
          frequency: 'MONTHLY' as never,
          shippingAddress: mockAddress,
          items: [{ productId: 'prod-1', quantity: 2 }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates the template when trade credit is approved and every product exists', async () => {
      prisma.tradeCreditAccount.findUnique.mockResolvedValue({ id: 'tca-1', approvedAt: new Date() } as never);
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as never);
      prisma.recurringOrderTemplate.create.mockResolvedValue({ id: 'template-1' } as never);

      await service.create('sub-1', 'buyer@example.com', {
        name: 'Monthly consumables',
        frequency: 'MONTHLY' as never,
        shippingAddress: mockAddress,
        items: [{ productId: 'prod-1', quantity: 2 }],
      });

      expect(prisma.recurringOrderTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ accountId: 'acc-1', name: 'Monthly consumables' }),
        }),
      );
    });
  });

  describe('processRecurringOrders', () => {
    it('does nothing when no templates are due', async () => {
      prisma.recurringOrderTemplate.findMany.mockResolvedValue([]);
      await service.processRecurringOrders();
      expect(ordersService.checkout).not.toHaveBeenCalled();
    });

    it("adds only the template's own items to the cart, then checks out ONLY those resulting cart item IDs — never the whole cart", async () => {
      prisma.recurringOrderTemplate.findMany.mockResolvedValue([
        {
          id: 'template-1',
          name: 'Monthly consumables',
          frequency: 'MONTHLY',
          shippingAddress: mockAddress,
          poNumber: null,
          account: { keycloakSub: 'sub-1', email: 'buyer@example.com' },
          items: [{ productId: 'prod-1', quantity: 2 }],
        },
      ] as never);
      cartService.bulkAddItems.mockResolvedValue({
        lines: [
          { cartItemId: 'ci-template', productId: 'prod-1' },
          { cartItemId: 'ci-unrelated', productId: 'prod-99' },
        ],
      });
      ordersService.checkout.mockResolvedValue({ id: 'order-1', orderNumber: 'BSWE-1' });

      await service.processRecurringOrders();

      expect(cartService.bulkAddItems).toHaveBeenCalledWith('sub-1', 'buyer@example.com', {
        items: [{ productId: 'prod-1', quantity: 2 }],
      });
      const [, , checkoutDto] = ordersService.checkout.mock.calls[0];
      expect(checkoutDto.cartItemIds).toEqual(['ci-template']);
      expect(checkoutDto.paymentMethod).toBe('trade_credit');
    });

    it('sends a success notification and updates lastRunAt/nextRunAt/clears lastRunError on success', async () => {
      prisma.recurringOrderTemplate.findMany.mockResolvedValue([
        {
          id: 'template-1',
          name: 'Monthly consumables',
          frequency: 'MONTHLY',
          shippingAddress: mockAddress,
          poNumber: null,
          account: { keycloakSub: 'sub-1', email: 'buyer@example.com' },
          items: [{ productId: 'prod-1', quantity: 2 }],
        },
      ] as never);
      cartService.bulkAddItems.mockResolvedValue({ lines: [{ cartItemId: 'ci-1', productId: 'prod-1' }] });
      ordersService.checkout.mockResolvedValue({ id: 'order-1', orderNumber: 'BSWE-1' });

      await service.processRecurringOrders();

      expect(notificationsService.queueRecurringOrderPlaced).toHaveBeenCalledWith(
        expect.objectContaining({ orderNumber: 'BSWE-1', templateName: 'Monthly consumables' }),
      );
      expect(prisma.recurringOrderTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'template-1' },
          data: expect.objectContaining({ lastRunError: null }),
        }),
      );
    });

    it('reschedules to the next cycle AND notifies of failure, without letting one failing template block the others', async () => {
      prisma.recurringOrderTemplate.findMany.mockResolvedValue([
        {
          id: 'template-1',
          name: 'Failing template',
          frequency: 'MONTHLY',
          shippingAddress: mockAddress,
          poNumber: null,
          account: { keycloakSub: 'sub-1', email: 'buyer@example.com' },
          items: [{ productId: 'prod-1', quantity: 2 }],
        },
        {
          id: 'template-2',
          name: 'Working template',
          frequency: 'MONTHLY',
          shippingAddress: mockAddress,
          poNumber: null,
          account: { keycloakSub: 'sub-2', email: 'buyer2@example.com' },
          items: [{ productId: 'prod-2', quantity: 1 }],
        },
      ] as never);

      cartService.bulkAddItems
        .mockResolvedValueOnce({ lines: [{ cartItemId: 'ci-1', productId: 'prod-1' }] })
        .mockResolvedValueOnce({ lines: [{ cartItemId: 'ci-2', productId: 'prod-2' }] });
      ordersService.checkout
        .mockRejectedValueOnce(new Error('Insufficient trade credit'))
        .mockResolvedValueOnce({ id: 'order-2', orderNumber: 'BSWE-2' });

      await service.processRecurringOrders();

      expect(prisma.recurringOrderTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'template-1' },
          data: expect.objectContaining({ lastRunError: 'Insufficient trade credit' }),
        }),
      );
      expect(notificationsService.queueRecurringOrderFailed).toHaveBeenCalledWith(
        expect.objectContaining({ templateName: 'Failing template', reason: 'Insufficient trade credit' }),
      );
      expect(notificationsService.queueRecurringOrderPlaced).toHaveBeenCalledWith(
        expect.objectContaining({ templateName: 'Working template' }),
      );
    });
  });
});
