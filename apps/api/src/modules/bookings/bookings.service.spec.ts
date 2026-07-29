import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: DeepMockProxy<PrismaService>;
  let accountsService: { resolveOrCreate: jest.Mock };
  let notificationsService: { queueBookingScheduled: jest.Mock };

  const mockAccount = { id: 'acc-1', keycloakSub: 'sub-1', email: 'buyer@example.com' };
  const baseDto = { sector: 'Residential', serviceCode: 'PIPE_REPAIR', siteAddress: '1 Main Rd' };

  beforeEach(async () => {
    prisma = createPrismaMock();
    accountsService = { resolveOrCreate: jest.fn().mockResolvedValue(mockAccount) };
    notificationsService = { queueBookingScheduled: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: accountsService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(BookingsService);
  });

  describe('create', () => {
    it('creates a booking with no order and no complexity multipliers', async () => {
      prisma.installationBooking.create.mockResolvedValue({ id: 'booking-1' } as never);

      await service.create('sub-1', 'buyer@example.com', baseDto);

      expect(prisma.installationBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ accountId: 'acc-1', orderId: undefined }) }),
      );
    });

    it('throws BadRequestException when a complexity multiplier code is unknown', async () => {
      prisma.complexityMultiplier.count.mockResolvedValue(1); // caller sent 2 codes, only 1 exists

      await expect(
        service.create('sub-1', 'buyer@example.com', {
          ...baseDto,
          complexityMultiplierCodes: ['AFTER_HOURS', 'NOT_REAL'],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.installationBooking.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the linked order belongs to a different account', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', accountId: 'someone-else' } as never);

      await expect(
        service.create('sub-1', 'buyer@example.com', { ...baseDto, orderId: 'order-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when the linked order already has a booking', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', accountId: 'acc-1' } as never);
      prisma.installationBooking.findUnique.mockResolvedValue({ id: 'existing-booking' } as never);

      await expect(
        service.create('sub-1', 'buyer@example.com', { ...baseDto, orderId: 'order-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.installationBooking.create).not.toHaveBeenCalled();
    });
  });

  describe('findOneForAccount', () => {
    it("throws ForbiddenException when the booking belongs to a different account", async () => {
      prisma.installationBooking.findUnique.mockResolvedValue({ id: 'b-1', accountId: 'someone-else' } as never);

      await expect(service.findOneForAccount('sub-1', 'buyer@example.com', 'b-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException when the booking does not exist', async () => {
      prisma.installationBooking.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus('missing', { status: 'SCHEDULED' as never })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('queues a booking.scheduled notification when the status transitions to SCHEDULED with a date', async () => {
      prisma.installationBooking.findUnique.mockResolvedValue({
        id: 'b-1',
        account: { email: 'buyer@example.com' },
      } as never);
      prisma.installationBooking.update.mockResolvedValue({
        id: 'b-1',
        scheduledFor: new Date('2026-08-01T09:00:00.000Z'),
        siteAddress: '1 Main Rd',
      } as never);

      await service.updateStatus('b-1', { status: 'SCHEDULED' as never, scheduledFor: '2026-08-01T09:00:00.000Z' });

      expect(notificationsService.queueBookingScheduled).toHaveBeenCalledWith({
        recipientEmail: 'buyer@example.com',
        bookingId: 'b-1',
        scheduledFor: '2026-08-01T09:00:00.000Z',
        siteAddress: '1 Main Rd',
      });
    });

    it('does not queue a notification for a status update that is not SCHEDULED', async () => {
      prisma.installationBooking.findUnique.mockResolvedValue({
        id: 'b-1',
        account: { email: 'buyer@example.com' },
      } as never);
      prisma.installationBooking.update.mockResolvedValue({ id: 'b-1', scheduledFor: null } as never);

      await service.updateStatus('b-1', { status: 'IN_PROGRESS' as never });

      expect(notificationsService.queueBookingScheduled).not.toHaveBeenCalled();
    });
  });

  describe('findAllAdmin', () => {
    it('returns every booking, not scoped to any single account', async () => {
      prisma.installationBooking.findMany.mockResolvedValue([
        { id: 'b-1', accountId: 'acc-1' },
        { id: 'b-2', accountId: 'acc-2' },
      ] as never);
      prisma.installationBooking.count.mockResolvedValue(2);

      const result = await service.findAllAdmin({ page: 1, pageSize: 20 });

      expect(result.items).toHaveLength(2);
      expect(prisma.installationBooking.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ where: expect.anything() }),
      );
    });
  });
});
