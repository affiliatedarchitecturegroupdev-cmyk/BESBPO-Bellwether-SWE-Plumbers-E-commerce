import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CartService } from '../cart/cart.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { InvoiceService } from './invoice.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: DeepMockProxy<PrismaService>;
  let accountsService: { resolveOrCreate: jest.Mock; resolveOrCreateGuest: jest.Mock };
  let cartService: { getCart: jest.Mock; bulkAddItems: jest.Mock; getCartForItems: jest.Mock };
  let notificationsService: { queueOrderConfirmed: jest.Mock; queueOrderShipped: jest.Mock };
  let auditLogService: { record: jest.Mock };
  let invoiceService: { generate: jest.Mock };

  const mockAccount = { id: 'acc-1', keycloakSub: 'sub-1', email: 'buyer@example.com' };
  const mockAddress = { line1: '1 Main Rd', city: 'Durban', province: 'KZN', postalCode: '4001' };

  const pricedCartWithItems = {
    cartId: 'cart-1',
    usingTradePricing: false,
    lines: [
      {
        cartItemId: 'ci-1',
        productId: 'prod-1',
        productSlug: 'test-product',
        name: 'Test Product',
        imageUrl: null,
        unitPrice: 100,
        quantity: 2,
        lineTotal: 200,
      },
    ],
    subtotal: 200,
    vatAmount: 30,
    total: 230,
  };

  const emptyPricedCart = { ...pricedCartWithItems, lines: [], subtotal: 0, vatAmount: 0, total: 0 };

  beforeEach(async () => {
    prisma = createPrismaMock();
    accountsService = { resolveOrCreate: jest.fn().mockResolvedValue(mockAccount), resolveOrCreateGuest: jest.fn() };
    cartService = { getCart: jest.fn(), bulkAddItems: jest.fn(), getCartForItems: jest.fn() };
    notificationsService = { queueOrderConfirmed: jest.fn(), queueOrderShipped: jest.fn() };
    auditLogService = { record: jest.fn() };
    invoiceService = { generate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: accountsService },
        { provide: CartService, useValue: cartService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: InvoiceService, useValue: invoiceService },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('checkout', () => {
    it('throws BadRequestException without creating an order, when the cart is empty', async () => {
      cartService.getCart.mockResolvedValue(emptyPricedCart);

      await expect(service.checkout('sub-1', 'buyer@example.com', { shippingAddress: mockAddress })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('creates the order snapshotting the product name, and does NOT clear the cart (that happens on payment confirmation now)', async () => {
      cartService.getCart.mockResolvedValue(pricedCartWithItems);
      prisma.product.updateMany.mockResolvedValue({ count: 1 } as never); // enough stock
      prisma.order.create.mockResolvedValue({ id: 'order-1' } as never);

      await service.checkout('sub-1', 'buyer@example.com', { shippingAddress: mockAddress, deliveryFee: 50 });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'prod-1', stockQty: { gte: 2 } },
        data: { stockQty: { decrement: 2 } },
      });
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountId: 'acc-1',
            deliveryFee: 50,
            total: 280, // 230 (cart total incl. VAT) + 50 delivery
            lineItems: {
              create: [
                expect.objectContaining({
                  productId: 'prod-1',
                  productName: 'Test Product', // the snapshot fix — see schema.prisma
                  quantity: 2,
                  unitPrice: 100,
                  lineTotal: 200,
                }),
              ],
            },
          }),
        }),
      );
      // The cart is deliberately untouched by checkout() now — see the
      // comment in orders.service.ts on why this moved to
      // PaymentsService.handleItn instead (fixes losing a cart on a
      // cancelled payment).
      expect(prisma.cartItem.deleteMany).not.toHaveBeenCalled();
    });

    it('passes poNumber through to order creation when supplied, and leaves it undefined when not', async () => {
      cartService.getCart.mockResolvedValue(pricedCartWithItems);
      prisma.product.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.order.create.mockResolvedValue({ id: 'order-1' } as never);

      await service.checkout('sub-1', 'buyer@example.com', {
        shippingAddress: mockAddress,
        poNumber: 'PO-2026-0042',
      });

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ poNumber: 'PO-2026-0042' }) }),
      );
    });

    it('sets placedByEmail to the CALLER\'s own email, not the resolved account\'s — matters once accounts can be shared', async () => {
      cartService.getCart.mockResolvedValue(pricedCartWithItems);
      prisma.product.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.order.create.mockResolvedValue({ id: 'order-1' } as never);
      // The account itself resolves to a DIFFERENT email than the caller —
      // exactly the multi-user case (a colleague checking out on a shared
      // account whose own top-level email belongs to the original owner).
      accountsService.resolveOrCreate.mockResolvedValue({ id: 'acc-1', email: 'owner@example.com' } as never);

      await service.checkout('sub-colleague', 'colleague@example.com', { shippingAddress: mockAddress });

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ placedByEmail: 'colleague@example.com' }) }),
      );
    });

    it('throws ConflictException and does not create an order, when stock is insufficient', async () => {
      cartService.getCart.mockResolvedValue(pricedCartWithItems);
      // updateMany's WHERE (stockQty >= quantity) matched nothing — someone
      // else bought the remaining stock first, or it dropped below cart qty.
      prisma.product.updateMany.mockResolvedValue({ count: 0 } as never);

      await expect(
        service.checkout('sub-1', 'buyer@example.com', { shippingAddress: mockAddress }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    describe('trade credit payment method', () => {
      const tradeCreditDto = {
        shippingAddress: mockAddress,
        paymentMethod: 'trade_credit' as const,
      };

      it('throws BadRequestException when the account has no trade credit account at all', async () => {
        cartService.getCart.mockResolvedValue(pricedCartWithItems);
        prisma.tradeCreditAccount.findUnique.mockResolvedValue(null);

        await expect(service.checkout('sub-1', 'buyer@example.com', tradeCreditDto)).rejects.toThrow(
          BadRequestException,
        );
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('throws BadRequestException when the trade credit account exists but is not yet approved', async () => {
        cartService.getCart.mockResolvedValue(pricedCartWithItems);
        prisma.tradeCreditAccount.findUnique.mockResolvedValue({ id: 'tca-1', approvedAt: null } as never);

        await expect(service.checkout('sub-1', 'buyer@example.com', tradeCreditDto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('throws BadRequestException when the order would exceed available credit, without creating the order', async () => {
        cartService.getCart.mockResolvedValue(pricedCartWithItems);
        prisma.tradeCreditAccount.findUnique.mockResolvedValue({ id: 'tca-1', approvedAt: new Date() } as never);
        prisma.product.updateMany.mockResolvedValue({ count: 1 } as never); // stock fine
        prisma.$executeRaw.mockResolvedValue(0); // credit check failed

        await expect(service.checkout('sub-1', 'buyer@example.com', tradeCreditDto)).rejects.toThrow(
          BadRequestException,
        );
        expect(prisma.order.create).not.toHaveBeenCalled();
        expect(notificationsService.queueOrderConfirmed).not.toHaveBeenCalled();
      });

      it('confirms the order immediately, clears the cart, and queues a notification when credit is sufficient', async () => {
        cartService.getCart.mockResolvedValue(pricedCartWithItems);
        prisma.tradeCreditAccount.findUnique.mockResolvedValue({ id: 'tca-1', approvedAt: new Date() } as never);
        prisma.product.updateMany.mockResolvedValue({ count: 1 } as never);
        prisma.$executeRaw.mockResolvedValue(1); // credit check passed
        prisma.order.create.mockResolvedValue({ id: 'order-1', orderNumber: 'BSWE-1', total: 230 } as never);
        prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1' } as never);

        await service.checkout('sub-1', 'buyer@example.com', tradeCreditDto);

        expect(prisma.order.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: 'CONFIRMED', paymentGateway: 'trade_credit' }),
          }),
        );
        expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
        expect(notificationsService.queueOrderConfirmed).toHaveBeenCalledWith(
          expect.objectContaining({ orderNumber: 'BSWE-1' }),
        );
      });
    });
  });

  describe('findOneForAccount', () => {
    it('returns the order when it belongs to the requesting account', async () => {
      const order = { id: 'order-1', accountId: 'acc-1' };
      prisma.order.findUnique.mockResolvedValue(order as never);

      const result = await service.findOneForAccount('sub-1', 'buyer@example.com', 'order-1');

      expect(result).toEqual(order);
    });

    it("throws ForbiddenException when the order belongs to a different account", async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', accountId: 'someone-else' } as never);

      await expect(service.findOneForAccount('sub-1', 'buyer@example.com', 'order-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when the order does not exist at all', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.findOneForAccount('sub-1', 'buyer@example.com', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException when the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus('missing', { status: 'DISPATCHED' as never })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('queues a shipped notification on a genuine transition to DISPATCHED', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CONFIRMED',
        account: { email: 'buyer@example.com' },
      } as never);
      prisma.order.update.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'BSWE-1',
        courierName: 'RAM',
        trackingNumber: 'RAM123456',
        trackingUrl: null,
      } as never);

      await service.updateStatus('order-1', {
        status: 'DISPATCHED' as never,
        courierName: 'RAM',
        trackingNumber: 'RAM123456',
      });

      expect(notificationsService.queueOrderShipped).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: 'buyer@example.com',
          courierName: 'RAM',
          trackingNumber: 'RAM123456',
          trackingUrl: 'https://www.ram.co.za/track', // resolved from the known-courier fallback, since trackingUrl wasn't supplied directly
        }),
      );
    });

    it('passes the account phone number through as recipientPhone, or null if none is on file', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CONFIRMED',
        account: { email: 'buyer@example.com', phone: '0821234567' },
      } as never);
      prisma.order.update.mockResolvedValue({ id: 'order-1', orderNumber: 'BSWE-1' } as never);

      await service.updateStatus('order-1', { status: 'DISPATCHED' as never });

      expect(notificationsService.queueOrderShipped).toHaveBeenCalledWith(
        expect.objectContaining({ recipientPhone: '0821234567' }),
      );
    });

    it('creates a CouponRedemption row, inside the same transaction, when a coupon actually discounted the cart', async () => {
      cartService.getCart.mockResolvedValue({ ...pricedCartWithItems, couponCode: 'SAVE10', discountAmount: 20 });
      prisma.product.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.order.create.mockResolvedValue({ id: 'order-1' } as never);
      prisma.coupon.findUniqueOrThrow.mockResolvedValue({ id: 'coupon-1', code: 'SAVE10' } as never);

      await service.checkout('sub-1', 'buyer@example.com', { shippingAddress: mockAddress });

      expect(prisma.couponRedemption.create).toHaveBeenCalledWith({
        data: {
          couponId: 'coupon-1',
          accountId: 'acc-1',
          orderId: 'order-1',
          discountAmount: 20,
        },
      });
    });

    it('does not create a CouponRedemption row when no coupon was applied', async () => {
      cartService.getCart.mockResolvedValue(pricedCartWithItems); // no couponCode field at all
      prisma.product.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.order.create.mockResolvedValue({ id: 'order-1' } as never);

      await service.checkout('sub-1', 'buyer@example.com', { shippingAddress: mockAddress });

      expect(prisma.couponRedemption.create).not.toHaveBeenCalled();
    });

    it('does not create a CouponRedemption row when a coupon code is present but became invalid (discountAmount 0)', async () => {
      // Mirrors what CartService.price() actually produces once a
      // coupon stops validating — couponCode stays visible, discountAmount
      // drops to 0. Checkout should proceed at full price with no
      // redemption recorded, not silently apply a discount anyway.
      cartService.getCart.mockResolvedValue({ ...pricedCartWithItems, couponCode: 'EXPIRED', discountAmount: 0 });
      prisma.product.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.order.create.mockResolvedValue({ id: 'order-1' } as never);

      await service.checkout('sub-1', 'buyer@example.com', { shippingAddress: mockAddress });

      expect(prisma.couponRedemption.create).not.toHaveBeenCalled();
    });

    it('passes the coupon snapshot through to order creation', async () => {
      cartService.getCart.mockResolvedValue({ ...pricedCartWithItems, couponCode: 'SAVE10', discountAmount: 20 });
      prisma.product.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.order.create.mockResolvedValue({ id: 'order-1' } as never);
      prisma.coupon.findUniqueOrThrow.mockResolvedValue({ id: 'coupon-1' } as never);

      await service.checkout('sub-1', 'buyer@example.com', { shippingAddress: mockAddress });

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ couponCode: 'SAVE10', discountAmount: 20 }),
        }),
      );
    });

    it('does not re-send the shipped notification when DISPATCHED is saved again (e.g. correcting a tracking number)', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'DISPATCHED', // already dispatched — this is a correction, not a new transition
        account: { email: 'buyer@example.com' },
      } as never);
      prisma.order.update.mockResolvedValue({ id: 'order-1', orderNumber: 'BSWE-1' } as never);

      await service.updateStatus('order-1', { status: 'DISPATCHED' as never, trackingNumber: 'RAM999' });

      expect(notificationsService.queueOrderShipped).not.toHaveBeenCalled();
    });

    it('saves tracking fields onto the order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CONFIRMED',
        account: { email: 'buyer@example.com' },
      } as never);
      prisma.order.update.mockResolvedValue({ id: 'order-1', orderNumber: 'BSWE-1' } as never);

      await service.updateStatus('order-1', {
        status: 'DISPATCHED' as never,
        courierName: 'RAM',
        trackingNumber: 'RAM123456',
      });

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ courierName: 'RAM', trackingNumber: 'RAM123456' }),
        }),
      );
    });
  });

  describe('findAllAdmin', () => {
    it('returns every order, not scoped to any single account', async () => {
      prisma.order.findMany.mockResolvedValue([
        { id: 'order-1', accountId: 'acc-1' },
        { id: 'order-2', accountId: 'acc-2' },
      ] as never);
      prisma.order.count.mockResolvedValue(2);

      const result = await service.findAllAdmin({ page: 1, pageSize: 20 });

      expect(result.items).toHaveLength(2);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ where: expect.anything() }),
      );
    });
  });

  describe('amendAddress', () => {
    const newAddress = { line1: '99 New Street', city: 'Cape Town', province: 'Western Cape', postalCode: '8001' };

    it.each(['PENDING', 'CONFIRMED', 'PROCESSING'])(
      'allows amending the address while status is %s',
      async (status) => {
        prisma.order.findUnique.mockResolvedValue({ id: 'order-1', accountId: 'acc-1', status } as never);
        prisma.order.update.mockResolvedValue({ id: 'order-1', status } as never);

        await service.amendAddress('sub-1', 'buyer@example.com', 'order-1', newAddress as never);

        expect(prisma.order.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'order-1' },
            data: expect.objectContaining({ shippingAddress: newAddress }),
          }),
        );
      },
    );

    it.each(['DISPATCHED', 'DELIVERED', 'CANCELLED', 'REFUNDED'])(
      'throws ConflictException once status is %s, without ever writing anything',
      async (status) => {
        prisma.order.findUnique.mockResolvedValue({ id: 'order-1', accountId: 'acc-1', status } as never);

        await expect(
          service.amendAddress('sub-1', 'buyer@example.com', 'order-1', newAddress as never),
        ).rejects.toThrow(ConflictException);
        expect(prisma.order.update).not.toHaveBeenCalled();
      },
    );

    it('throws ForbiddenException for an order that belongs to a different account, before even checking status', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        accountId: 'someone-elses-account',
        status: 'PENDING',
      } as never);

      await expect(
        service.amendAddress('sub-1', 'buyer@example.com', 'order-1', newAddress as never),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('records an audit log entry attributed to the customer', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', accountId: 'acc-1', status: 'PENDING' } as never);
      prisma.order.update.mockResolvedValue({ id: 'order-1' } as never);

      await service.amendAddress('sub-1', 'buyer@example.com', 'order-1', newAddress as never);

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorEmail: 'buyer@example.com', action: 'order.address_amended' }),
      );
    });
  });

  describe('guestCheckout', () => {
    const guestAccount = { id: 'guest-1', keycloakSub: 'guest:uuid-1', email: 'guest@example.com' };
    const dto = {
      email: 'guest@example.com',
      shippingAddress: mockAddress,
      items: [{ productId: 'prod-1', quantity: 2 }],
      poNumber: 'PO-123',
    };

    it('resolves/creates the guest account, adds the requested items to its cart, then delegates to checkout()', async () => {
      accountsService.resolveOrCreateGuest.mockResolvedValue(guestAccount);
      cartService.bulkAddItems.mockResolvedValue({} as never);
      const checkoutSpy = jest.spyOn(service, 'checkout').mockResolvedValue({ id: 'order-1' } as never);

      await service.guestCheckout(dto as never);

      expect(accountsService.resolveOrCreateGuest).toHaveBeenCalledWith('guest@example.com', undefined, undefined);
      expect(cartService.bulkAddItems).toHaveBeenCalledWith('guest:uuid-1', 'guest@example.com', {
        items: dto.items,
      });
      expect(checkoutSpy).toHaveBeenCalledWith(
        'guest:uuid-1',
        'guest@example.com',
        expect.objectContaining({ paymentMethod: 'payfast', poNumber: 'PO-123' }),
      );
    });

    it('always uses PAYFAST, regardless of anything else — there is no paymentMethod field on the guest DTO to even attempt trade credit with', async () => {
      accountsService.resolveOrCreateGuest.mockResolvedValue(guestAccount);
      cartService.bulkAddItems.mockResolvedValue({} as never);
      const checkoutSpy = jest.spyOn(service, 'checkout').mockResolvedValue({ id: 'order-1' } as never);

      await service.guestCheckout(dto as never);

      const [, , checkoutDto] = checkoutSpy.mock.calls[0];
      expect((checkoutDto as { paymentMethod: string }).paymentMethod).toBe('payfast');
    });
  });

  describe('getInvoicePdf', () => {
    it('throws ForbiddenException, without generating a PDF, for an order belonging to a different account', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', accountId: 'someone-elses-acc' } as never);

      await expect(service.getInvoicePdf('sub-1', 'buyer@example.com', 'order-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(invoiceService.generate).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an order that does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.getInvoicePdf('sub-1', 'buyer@example.com', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the generated buffer alongside the order number, for the caller\u2019s own order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        accountId: 'acc-1',
        orderNumber: 'BSWE-1001',
      } as never);
      invoiceService.generate.mockResolvedValue(Buffer.from('fake-pdf'));

      const result = await service.getInvoicePdf('sub-1', 'buyer@example.com', 'order-1');

      expect(result.orderNumber).toBe('BSWE-1001');
      expect(result.buffer).toEqual(Buffer.from('fake-pdf'));
    });
  });

  describe('getInvoicePdfAdmin', () => {
    it('generates a PDF for any order, with no ownership check at all', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        accountId: 'some-customers-account',
        orderNumber: 'BSWE-2002',
      } as never);
      invoiceService.generate.mockResolvedValue(Buffer.from('fake-pdf'));

      const result = await service.getInvoicePdfAdmin('order-1');

      expect(result.orderNumber).toBe('BSWE-2002');
      expect(accountsService.resolveOrCreate).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an order that does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.getInvoicePdfAdmin('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkout — split checkout (cartItemIds)', () => {
    it('uses getCart (the whole cart) when cartItemIds is not provided — existing, unchanged behavior', async () => {
      cartService.getCart.mockResolvedValue(pricedCartWithItems);
      prisma.product.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.order.create.mockResolvedValue({ id: 'order-1' } as never);

      await service.checkout('sub-1', 'buyer@example.com', { shippingAddress: mockAddress });

      expect(cartService.getCart).toHaveBeenCalledWith('sub-1', 'buyer@example.com');
      expect(cartService.getCartForItems).not.toHaveBeenCalled();
    });

    it('uses getCartForItems, scoped to the given IDs, when cartItemIds IS provided', async () => {
      cartService.getCartForItems.mockResolvedValue(pricedCartWithItems);
      prisma.product.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.order.create.mockResolvedValue({ id: 'order-1' } as never);

      await service.checkout('sub-1', 'buyer@example.com', {
        shippingAddress: mockAddress,
        cartItemIds: ['ci-1'],
      } as never);

      expect(cartService.getCartForItems).toHaveBeenCalledWith('sub-1', 'buyer@example.com', ['ci-1']);
      expect(cartService.getCart).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when splitting AND a coupon is currently applied — genuinely ambiguous which split should keep the discount', async () => {
      cartService.getCartForItems.mockResolvedValue({ ...pricedCartWithItems, couponCode: 'SAVE10' });

      await expect(
        service.checkout('sub-1', 'buyer@example.com', {
          shippingAddress: mockAddress,
          cartItemIds: ['ci-1'],
        } as never),
      ).rejects.toThrow('Remove the applied coupon before splitting checkout across multiple addresses');
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('does NOT throw for a coupon-applied cart when cartItemIds is omitted — the block is specific to splitting, not coupons generally', async () => {
      cartService.getCart.mockResolvedValue({ ...pricedCartWithItems, couponCode: 'SAVE10', discountAmount: 20 });
      prisma.product.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.order.create.mockResolvedValue({ id: 'order-1' } as never);
      prisma.coupon.findUniqueOrThrow.mockResolvedValue({ id: 'coupon-1' } as never);

      await expect(
        service.checkout('sub-1', 'buyer@example.com', { shippingAddress: mockAddress }),
      ).resolves.not.toThrow();
    });

    it('scopes trade-credit cart-clearing to just the split items, not the whole cart', async () => {
      cartService.getCartForItems.mockResolvedValue(pricedCartWithItems);
      prisma.tradeCreditAccount.findUnique.mockResolvedValue({ id: 'tca-1', approvedAt: new Date() } as never);
      prisma.product.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.$executeRaw.mockResolvedValue(1);
      prisma.order.create.mockResolvedValue({ id: 'order-1', orderNumber: 'BSWE-1', total: 230 } as never);
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1' } as never);

      await service.checkout('sub-1', 'buyer@example.com', {
        shippingAddress: mockAddress,
        cartItemIds: ['ci-1'],
        paymentMethod: 'trade_credit' as const,
      } as never);

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1', id: { in: ['ci-1'] } },
      });
    });
  });

  describe('findByOrderNumberAndEmail — guest order tracking', () => {
    it('throws NotFoundException when no order matches the given order number at all', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.findByOrderNumberAndEmail('BSWE-9999', 'buyer@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws the exact same NotFoundException when the order exists but the email does not match — never reveals which case it was', async () => {
      prisma.order.findUnique.mockResolvedValue({
        orderNumber: 'BSWE-1',
        account: { email: 'real-owner@example.com' },
      } as never);

      await expect(service.findByOrderNumberAndEmail('BSWE-1', 'wrong-guess@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('matches email case-insensitively', async () => {
      prisma.order.findUnique.mockResolvedValue({
        orderNumber: 'BSWE-1',
        account: { email: 'Buyer@Example.com' },
      } as never);

      await expect(
        service.findByOrderNumberAndEmail('BSWE-1', 'buyer@example.com'),
      ).resolves.not.toThrow();
    });

    it('returns the order when both the order number and email genuinely match', async () => {
      const order = { orderNumber: 'BSWE-1', account: { email: 'buyer@example.com' } };
      prisma.order.findUnique.mockResolvedValue(order as never);

      const result = await service.findByOrderNumberAndEmail('BSWE-1', 'buyer@example.com');

      expect(result).toEqual(order);
    });
  });
});
