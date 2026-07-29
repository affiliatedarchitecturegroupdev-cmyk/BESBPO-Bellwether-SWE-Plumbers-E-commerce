import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { ReturnsService } from './returns.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('ReturnsService', () => {
  let service: ReturnsService;
  let prisma: DeepMockProxy<PrismaService>;
  let accountsService: { resolveOrCreate: jest.Mock };
  let paymentsService: { refundForReturn: jest.Mock };
  let notificationsService: { queueReturnStatusChanged: jest.Mock };

  const mockAccount = { id: 'acc-1', keycloakSub: 'sub-1', email: 'buyer@example.com' };
  const orderLineItem = { id: 'oli-1', quantity: 3, productName: 'Copper Pipe 15mm' };
  // Every fetched return request now carries order/account for the
  // notification queued on every transition — this is the shared shape
  // findByIdOrThrow's mock return values need from here on.
  const withNotifyFields = (fields: Record<string, unknown>) => ({
    order: { orderNumber: 'BSWE-1' },
    account: { email: 'buyer@example.com' },
    ...fields,
  });

  beforeEach(async () => {
    prisma = createPrismaMock();
    accountsService = { resolveOrCreate: jest.fn().mockResolvedValue(mockAccount) };
    paymentsService = { refundForReturn: jest.fn() };
    notificationsService = { queueReturnStatusChanged: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: accountsService },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(ReturnsService);
  });

  describe('create', () => {
    it('throws NotFoundException for an order that does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.create('sub-1', 'buyer@example.com', {
          orderId: 'missing',
          reason: 'DEFECTIVE' as never,
          lineItems: [{ orderLineItemId: 'oli-1', quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for an order belonging to a different account', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        accountId: 'someone-elses-acc',
        status: 'DELIVERED',
        lineItems: [orderLineItem],
      } as never);

      await expect(
        service.create('sub-1', 'buyer@example.com', {
          orderId: 'order-1',
          reason: 'DEFECTIVE' as never,
          lineItems: [{ orderLineItemId: 'oli-1', quantity: 1 }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for an order that is not DELIVERED', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        accountId: 'acc-1',
        status: 'DISPATCHED',
        lineItems: [orderLineItem],
      } as never);

      await expect(
        service.create('sub-1', 'buyer@example.com', {
          orderId: 'order-1',
          reason: 'DEFECTIVE' as never,
          lineItems: [{ orderLineItemId: 'oli-1', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the requested line item does not belong to the order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        accountId: 'acc-1',
        status: 'DELIVERED',
        lineItems: [orderLineItem],
      } as never);

      await expect(
        service.create('sub-1', 'buyer@example.com', {
          orderId: 'order-1',
          reason: 'DEFECTIVE' as never,
          lineItems: [{ orderLineItemId: 'not-on-this-order', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when requesting more than the original quantity', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        accountId: 'acc-1',
        status: 'DELIVERED',
        lineItems: [orderLineItem],
      } as never);
      prisma.returnLineItem.aggregate.mockResolvedValue({ _sum: { quantity: null } } as never);

      await expect(
        service.create('sub-1', 'buyer@example.com', {
          orderId: 'order-1',
          reason: 'DEFECTIVE' as never,
          lineItems: [{ orderLineItemId: 'oli-1', quantity: 5 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when a PRIOR non-rejected return already used up the line's quantity", async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        accountId: 'acc-1',
        status: 'DELIVERED',
        lineItems: [orderLineItem],
      } as never);
      prisma.returnLineItem.aggregate.mockResolvedValue({ _sum: { quantity: 2 } } as never);

      await expect(
        service.create('sub-1', 'buyer@example.com', {
          orderId: 'order-1',
          reason: 'DEFECTIVE' as never,
          lineItems: [{ orderLineItemId: 'oli-1', quantity: 2 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates the return request when everything checks out', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        accountId: 'acc-1',
        status: 'DELIVERED',
        lineItems: [orderLineItem],
      } as never);
      prisma.returnLineItem.aggregate.mockResolvedValue({ _sum: { quantity: null } } as never);
      prisma.returnRequest.create.mockResolvedValue({ id: 'return-1' } as never);

      await service.create('sub-1', 'buyer@example.com', {
        orderId: 'order-1',
        reason: 'DEFECTIVE' as never,
        lineItems: [{ orderLineItemId: 'oli-1', quantity: 2 }],
      });

      expect(prisma.returnRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orderId: 'order-1', accountId: 'acc-1' }),
        }),
      );
    });
  });

  describe('approve', () => {
    it('throws BadRequestException when the request is not currently REQUESTED', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'APPROVED' }) as never);
      await expect(service.approve('return-1')).rejects.toThrow(BadRequestException);
      expect(prisma.returnRequest.update).not.toHaveBeenCalled();
    });

    it('moves REQUESTED to APPROVED', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'REQUESTED' }) as never);
      prisma.returnRequest.update.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'APPROVED' }) as never);

      await service.approve('return-1', 'Looks legitimate');

      expect(prisma.returnRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'return-1' },
          data: { status: 'APPROVED', adminNote: 'Looks legitimate' },
        }),
      );
    });

    it('queues a real status-changed notification with the actual order number', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'REQUESTED' }) as never);
      prisma.returnRequest.update.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'APPROVED' }) as never);

      await service.approve('return-1');

      expect(notificationsService.queueReturnStatusChanged).toHaveBeenCalledWith({
        recipientEmail: 'buyer@example.com',
        orderNumber: 'BSWE-1',
        newStatus: 'APPROVED',
      });
    });
  });

  describe('reject', () => {
    it('allows rejection from REQUESTED', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'REQUESTED' }) as never);
      prisma.returnRequest.update.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'REJECTED' }) as never);

      await service.reject('return-1', 'Outside return window');

      expect(prisma.returnRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'return-1' },
          data: { status: 'REJECTED', adminNote: 'Outside return window' },
        }),
      );
      expect(notificationsService.queueReturnStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({ newStatus: 'REJECTED' }),
      );
    });

    it('allows rejection from RECEIVED (post-inspection rejection)', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'RECEIVED' }) as never);
      prisma.returnRequest.update.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'REJECTED' }) as never);

      await service.reject('return-1', 'Normal wear, not a defect');

      expect(prisma.returnRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED' }) }),
      );
    });

    it('rejects an attempted rejection from APPROVED — not a valid transition', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'APPROVED' }) as never);
      await expect(service.reject('return-1', 'note')).rejects.toThrow(BadRequestException);
      expect(prisma.returnRequest.update).not.toHaveBeenCalled();
    });
  });

  describe('resolveAsRefund', () => {
    it('throws BadRequestException when not currently RECEIVED, without ever calling PaymentsService', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'APPROVED' }) as never);
      await expect(service.resolveAsRefund('return-1', { refundAmount: 100 })).rejects.toThrow(
        BadRequestException,
      );
      expect(paymentsService.refundForReturn).not.toHaveBeenCalled();
    });

    it('calls PaymentsService.refundForReturn with the orderId and specified amount, then marks REFUNDED', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue(
        withNotifyFields({ id: 'return-1', status: 'RECEIVED', orderId: 'order-1' }) as never,
      );
      prisma.returnRequest.update.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'REFUNDED' }) as never);

      await service.resolveAsRefund('return-1', { refundAmount: 250, adminNote: 'Partial refund' });

      expect(paymentsService.refundForReturn).toHaveBeenCalledWith('order-1', 250, expect.any(String));
      expect(prisma.returnRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'return-1' },
          data: { status: 'REFUNDED', refundAmount: 250, adminNote: 'Partial refund' },
        }),
      );
    });

    it('does not mark REFUNDED, and does not notify, if the refund call itself throws', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue(
        withNotifyFields({ id: 'return-1', status: 'RECEIVED', orderId: 'order-1' }) as never,
      );
      paymentsService.refundForReturn.mockRejectedValue(new Error('PayFast refund failed'));

      await expect(service.resolveAsRefund('return-1', { refundAmount: 250 })).rejects.toThrow(
        'PayFast refund failed',
      );
      expect(prisma.returnRequest.update).not.toHaveBeenCalled();
      expect(notificationsService.queueReturnStatusChanged).not.toHaveBeenCalled();
    });
  });

  describe('resolveAsReplacement', () => {
    it('throws BadRequestException when not currently RECEIVED', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'APPROVED' }) as never);
      await expect(service.resolveAsReplacement('return-1')).rejects.toThrow(BadRequestException);
    });

    it('moves RECEIVED to REPLACED without touching PaymentsService at all', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'RECEIVED' }) as never);
      prisma.returnRequest.update.mockResolvedValue(withNotifyFields({ id: 'return-1', status: 'REPLACED' }) as never);

      await service.resolveAsReplacement('return-1');

      expect(paymentsService.refundForReturn).not.toHaveBeenCalled();
      expect(prisma.returnRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'return-1' },
          data: { status: 'REPLACED', adminNote: undefined },
        }),
      );
      expect(notificationsService.queueReturnStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({ newStatus: 'REPLACED' }),
      );
    });
  });

  describe('findOneForAccount', () => {
    it('throws ForbiddenException for a return request belonging to a different account', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue(
        withNotifyFields({ id: 'return-1', accountId: 'someone-else' }) as never,
      );
      await expect(service.findOneForAccount('sub-1', 'buyer@example.com', 'return-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
