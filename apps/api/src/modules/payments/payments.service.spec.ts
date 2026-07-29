import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { AccountsService } from '../accounts/accounts.service';
import { CartService } from '../cart/cart.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';
import { generatePayfastSignature } from './payfast/payfast-signature.util';
import * as ipUtil from './payfast/payfast-ip.util';

// Not covered here: the two network-dependent steps in handleItn — DNS
// resolution against PayFast's hostnames (payfast-ip.util.ts) and the
// live POST-back to PayFast's /eng/query/validate endpoint. Both need a
// real network call or a much heavier mock to test meaningfully; they're
// integration-test territory, same reasoning as products.service.spec.ts's
// note on the full-text search path. isValidPayfastSourceIp is mocked
// below purely so the tests that need to get *past* it can, not because
// its own logic is verified here.
describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: DeepMockProxy<PrismaService>;
  let ordersService: { updateStatus: jest.Mock; guestCheckout: jest.Mock };
  let accountsService: { resolveOrCreate: jest.Mock; resolveOrCreateGuest: jest.Mock };
  let cartService: { clear: jest.Mock };
  let notificationsService: { queueOrderConfirmed: jest.Mock; queueOrderCancelled: jest.Mock };
  let auditLogService: { record: jest.Mock };
  let config: Record<string, string>;

  const mockAccount = { id: 'acc-1', email: 'buyer@example.com', companyName: null };

  beforeEach(async () => {
    prisma = createPrismaMock();
    ordersService = { updateStatus: jest.fn(), guestCheckout: jest.fn() };
    accountsService = { resolveOrCreate: jest.fn().mockResolvedValue(mockAccount), resolveOrCreateGuest: jest.fn() };
    cartService = { clear: jest.fn() };
    notificationsService = { queueOrderConfirmed: jest.fn(), queueOrderCancelled: jest.fn() };
    auditLogService = { record: jest.fn() };
    config = {
      PAYFAST_MERCHANT_ID: '10000100',
      PAYFAST_MERCHANT_KEY: '46f0cd694581a',
      PAYFAST_PASSPHRASE: '',
      PAYFAST_MODE: 'sandbox',
      PUBLIC_WEB_URL: 'https://bellwetherswe.shop',
      PUBLIC_API_URL: 'https://api.bellwetherswe.shop',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrdersService, useValue: ordersService },
        { provide: AccountsService, useValue: accountsService },
        { provide: CartService, useValue: cartService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: ConfigService, useValue: { get: (key: string) => config[key] } },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  describe('initiateCheckout', () => {
    const mockOrder = { id: 'order-1', accountId: 'acc-1', status: 'PENDING', total: 150, orderNumber: 'BSWE-1' };

    it('throws NotFoundException when the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.initiateCheckout('sub-1', 'buyer@example.com', 'order-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the order belongs to a different account', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...mockOrder, accountId: 'someone-else' } as never);
      await expect(service.initiateCheckout('sub-1', 'buyer@example.com', 'order-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ConflictException when the order is not PENDING', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' } as never);
      await expect(service.initiateCheckout('sub-1', 'buyer@example.com', 'order-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws when PayFast merchant credentials are not configured', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder as never);
      config.PAYFAST_MERCHANT_ID = '';
      await expect(service.initiateCheckout('sub-1', 'buyer@example.com', 'order-1')).rejects.toThrow(
        'Missing required config for PayFast integration: PAYFAST_MERCHANT_ID',
      );
    });

    it('returns the sandbox action URL when PAYFAST_MODE is not production', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder as never);
      const result = await service.initiateCheckout('sub-1', 'buyer@example.com', 'order-1');
      expect(result.actionUrl).toBe('https://sandbox.payfast.co.za/eng/process');
      expect(result.fields.m_payment_id).toBe('order-1');
      expect(result.fields.amount).toBe('150.00');
    });

    it('returns the live action URL when PAYFAST_MODE is production', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder as never);
      config.PAYFAST_MODE = 'production';
      const result = await service.initiateCheckout('sub-1', 'buyer@example.com', 'order-1');
      expect(result.actionUrl).toBe('https://www.payfast.co.za/eng/process');
    });
  });

  describe('handleItn', () => {
    const validEntries: [string, string][] = [
      ['m_payment_id', 'order-1'],
      ['pf_payment_id', 'pf-123'],
      ['payment_status', 'COMPLETE'],
      ['amount_gross', '150.00'],
      ['merchant_id', '10000100'],
    ];

    function buildValidPayload(overrides: Record<string, string> = {}) {
      const entries = validEntries.map(([k, v]) => [k, overrides[k] ?? v] as [string, string]);
      const signature = generatePayfastSignature(entries, config.PAYFAST_PASSPHRASE || undefined);
      return Object.fromEntries([...entries, ['signature', signature]]) as never;
    }

    it('throws BadRequestException on a signature mismatch, before any network call', async () => {
      const payload = buildValidPayload();
      payload.signature = 'deliberately-wrong-signature';

      await expect(service.handleItn(payload, '127.0.0.1')).rejects.toThrow(BadRequestException);
      expect(ordersService.updateStatus).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when merchant_id does not match this account', async () => {
      const payload = buildValidPayload({ merchant_id: 'someone-elses-merchant-id' });
      // Signature was computed over the tampered merchant_id, so it's
      // "valid" for this payload — this test is specifically about the
      // merchant_id check catching an ITN correctly signed for a
      // *different* merchant, not a signature failure.
      await expect(service.handleItn(payload, '127.0.0.1')).rejects.toThrow(BadRequestException);
    });

    it('updates the order to CONFIRMED and queues an order-confirmed notification, when all checks pass and payment_status is COMPLETE', async () => {
      jest.spyOn(ipUtil, 'isValidPayfastSourceIp').mockResolvedValue(true);
      global.fetch = jest.fn().mockResolvedValue({ text: () => Promise.resolve('VALID') }) as never;
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        total: 150,
        orderNumber: 'BSWE-1',
        account: { email: 'buyer@example.com', keycloakSub: 'sub-1' },
        lineItems: [{ productId: 'prod-1' }, { productId: 'prod-2' }],
      } as never);

      const payload = buildValidPayload();
      await service.handleItn(payload, '127.0.0.1');

      expect(ordersService.updateStatus).toHaveBeenCalledWith('order-1', {
        status: 'CONFIRMED',
        paymentRef: 'pf-123',
      });
      expect(cartService.clear).toHaveBeenCalledWith('sub-1', 'buyer@example.com', ['prod-1', 'prod-2']);
      expect(notificationsService.queueOrderConfirmed).toHaveBeenCalledWith({
        recipientEmail: 'buyer@example.com',
        orderNumber: 'BSWE-1',
        total: '150.00',
      });
    });

    it('does not update order status or queue a notification when payment_status is not COMPLETE', async () => {
      jest.spyOn(ipUtil, 'isValidPayfastSourceIp').mockResolvedValue(true);
      global.fetch = jest.fn().mockResolvedValue({ text: () => Promise.resolve('VALID') }) as never;
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        total: 150,
        account: { email: 'buyer@example.com', keycloakSub: 'sub-1' },
      } as never);

      const payload = buildValidPayload({ payment_status: 'FAILED' });
      await service.handleItn(payload, '127.0.0.1');

      expect(ordersService.updateStatus).not.toHaveBeenCalled();
      expect(notificationsService.queueOrderConfirmed).not.toHaveBeenCalled();
      // The actual fix: a cancelled/failed payment must NOT clear the
      // cart — see the class-level comment on the success branch in
      // payments.service.ts for the gap this closes.
      expect(cartService.clear).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the ITN amount does not match the order total', async () => {
      jest.spyOn(ipUtil, 'isValidPayfastSourceIp').mockResolvedValue(true);
      global.fetch = jest.fn().mockResolvedValue({ text: () => Promise.resolve('VALID') }) as never;
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        total: 999,
        account: { email: 'buyer@example.com', keycloakSub: 'sub-1' },
      } as never);

      const payload = buildValidPayload(); // amount_gross: 150.00, order total: 999
      await expect(service.handleItn(payload, '127.0.0.1')).rejects.toThrow(BadRequestException);
      expect(ordersService.updateStatus).not.toHaveBeenCalled();
      expect(notificationsService.queueOrderConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    const lineItem = { productId: 'prod-1', quantity: 2 };

    it('throws NotFoundException when the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.cancelOrder('sub-1', 'buyer@example.com', 'order-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the order belongs to a different account', async () => {
      prisma.order.findUnique.mockResolvedValue({ accountId: 'someone-else', lineItems: [] } as never);
      await expect(service.cancelOrder('sub-1', 'buyer@example.com', 'order-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ConflictException once an order has moved past CONFIRMED (e.g. DISPATCHED)', async () => {
      prisma.order.findUnique.mockResolvedValue({ accountId: 'acc-1', status: 'DISPATCHED', lineItems: [] } as never);
      await expect(service.cancelOrder('sub-1', 'buyer@example.com', 'order-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('cancels a PENDING order without calling PayFast, restores stock, and does not mark it refunded', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        accountId: 'acc-1',
        status: 'PENDING',
        orderNumber: 'BSWE-1',
        total: 200,
        paymentRef: null,
        lineItems: [lineItem],
      } as never);
      prisma.order.findUniqueOrThrow.mockResolvedValue({ id: 'order-1', status: 'CANCELLED' } as never);
      global.fetch = jest.fn();

      await service.cancelOrder('sub-1', 'buyer@example.com', 'order-1');

      expect(global.fetch).not.toHaveBeenCalled(); // no refund call — nothing was ever paid
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stockQty: { increment: 2 } },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'CANCELLED' },
      });
      expect(notificationsService.queueOrderCancelled).toHaveBeenCalledWith(
        expect.objectContaining({ wasRefunded: false }),
      );
    });

    it('refunds via PayFast, restores stock, and marks a CONFIRMED order REFUNDED', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        accountId: 'acc-1',
        status: 'CONFIRMED',
        orderNumber: 'BSWE-1',
        total: 200,
        paymentRef: 'pf-123',
        lineItems: [lineItem],
      } as never);
      prisma.order.findUniqueOrThrow.mockResolvedValue({ id: 'order-1', status: 'REFUNDED' } as never);
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as never;

      await service.cancelOrder('sub-1', 'buyer@example.com', 'order-1', 'Customer changed their mind');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.payfast.co.za/refunds/pf-123'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'REFUNDED' },
      });
      expect(notificationsService.queueOrderCancelled).toHaveBeenCalledWith(
        expect.objectContaining({ wasRefunded: true }),
      );
    });

    it('does not restore stock or change order status when the PayFast refund call fails', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        accountId: 'acc-1',
        status: 'CONFIRMED',
        orderNumber: 'BSWE-1',
        total: 200,
        paymentRef: 'pf-123',
        lineItems: [lineItem],
      } as never);
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('error') }) as never;

      await expect(service.cancelOrder('sub-1', 'buyer@example.com', 'order-1')).rejects.toThrow(
        BadRequestException,
      );

      // The order stays exactly as it was — no partial cancellation.
      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(notificationsService.queueOrderCancelled).not.toHaveBeenCalled();
    });
  });

  describe('guestCheckoutWithPayment', () => {
    const guestAccount = { id: 'guest-1', keycloakSub: 'guest:uuid-1', email: 'guest@example.com' };
    const dto = {
      email: 'guest@example.com',
      shippingAddress: { line1: '1 Main Rd', city: 'Cape Town', province: 'Western Cape', postalCode: '8001' },
      items: [{ productId: 'prod-1', quantity: 1 }],
    };

    it('creates the guest order, then initiates PayFast payment for it using the SAME guest identity — order creation and payment never end up on two different accounts', async () => {
      ordersService.guestCheckout.mockResolvedValue({ id: 'order-1' });
      accountsService.resolveOrCreateGuest.mockResolvedValue(guestAccount);
      const initiateSpy = jest
        .spyOn(service, 'initiateCheckout')
        .mockResolvedValue({ actionUrl: 'https://payfast.example', fields: {} } as never);

      const result = await service.guestCheckoutWithPayment(dto as never);

      expect(ordersService.guestCheckout).toHaveBeenCalledWith(dto);
      expect(initiateSpy).toHaveBeenCalledWith('guest:uuid-1', 'guest@example.com', 'order-1');
      expect(result.order).toEqual({ id: 'order-1' });
      expect(result.payfast).toEqual({ actionUrl: 'https://payfast.example', fields: {} });
    });

    it('re-resolves the guest account by email rather than assuming one was already created — safe since resolveOrCreateGuest is idempotent', async () => {
      ordersService.guestCheckout.mockResolvedValue({ id: 'order-1' });
      accountsService.resolveOrCreateGuest.mockResolvedValue(guestAccount);
      jest.spyOn(service, 'initiateCheckout').mockResolvedValue({ actionUrl: '', fields: {} } as never);

      await service.guestCheckoutWithPayment(dto as never);

      expect(accountsService.resolveOrCreateGuest).toHaveBeenCalledWith('guest@example.com', undefined, undefined);
    });
  });

  describe('refundForReturn', () => {
    it('throws NotFoundException for an order that does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.refundForReturn('missing', 100, 'reason')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the order has no paymentRef, without ever calling PayFast', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', paymentRef: null } as never);
      global.fetch = jest.fn();

      await expect(service.refundForReturn('order-1', 100, 'reason')).rejects.toThrow(BadRequestException);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("calls PayFast's refund API using the order's own paymentRef and the exact amount given, not the order's full total", async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', paymentRef: 'pf-payment-123' } as never);
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as never;

      // A deliberately PARTIAL amount, less than any plausible full order
      // total — proving this doesn't fall back to order.total the way
      // cancelOrder's own refund call does.
      await service.refundForReturn('order-1', 75.5, 'Return resolved via refund');

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/refunds/pf-payment-123');
      const body = JSON.parse(options.body);
      expect(body.amount).toBe('7550'); // cents: 75.50 -> 7550
    });

    it('propagates a PayFast rejection as a real error, not a silent no-op', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', paymentRef: 'pf-payment-123' } as never);
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 422, text: () => Promise.resolve('bad') }) as never;

      await expect(service.refundForReturn('order-1', 75.5, 'reason')).rejects.toThrow(BadRequestException);
    });
  });
});
