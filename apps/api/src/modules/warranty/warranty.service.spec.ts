import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { WarrantyService } from './warranty.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('WarrantyService', () => {
  let service: WarrantyService;
  let prisma: DeepMockProxy<PrismaService>;
  let notificationsService: { queueWarrantyIssued: jest.Mock };
  let auditLogService: { record: jest.Mock };

  const actorEmail = 'admin@bellwetherswe.co.za';

  beforeEach(async () => {
    prisma = createPrismaMock();
    notificationsService = { queueWarrantyIssued: jest.fn() };
    auditLogService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarrantyService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: { resolveOrCreate: jest.fn() } },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(WarrantyService);
  });

  describe('issue', () => {
    it('throws NotFoundException when the booking does not exist', async () => {
      prisma.installationBooking.findUnique.mockResolvedValue(null);
      await expect(service.issue({ bookingId: 'missing' }, actorEmail)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the booking is not yet COMPLETED', async () => {
      prisma.installationBooking.findUnique.mockResolvedValue({
        id: 'b-1',
        status: 'SCHEDULED',
        account: { email: 'buyer@example.com' },
      } as never);

      await expect(service.issue({ bookingId: 'b-1' }, actorEmail)).rejects.toThrow(BadRequestException);
      expect(notificationsService.queueWarrantyIssued).not.toHaveBeenCalled();
    });

    it('creates the warranty record, queues a notification, and records an audit entry, for a COMPLETED booking', async () => {
      prisma.installationBooking.findUnique.mockResolvedValue({
        id: 'b-1',
        accountId: 'acc-1',
        status: 'COMPLETED',
        account: { email: 'buyer@example.com' },
      } as never);
      prisma.warrantyRecord.create.mockResolvedValue({ id: 'warranty-1' } as never);

      await service.issue({ bookingId: 'b-1', termMonths: 24 }, actorEmail);

      expect(prisma.warrantyRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ accountId: 'acc-1', termMonths: 24 }) }),
      );
      expect(notificationsService.queueWarrantyIssued).toHaveBeenCalledWith(
        expect.objectContaining({ recipientEmail: 'buyer@example.com', warrantyId: 'warranty-1', termMonths: 24 }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorEmail, action: 'warranty.issued', targetId: 'warranty-1' }),
      );
    });

    it('defaults to a 12-month term when none is given', async () => {
      prisma.installationBooking.findUnique.mockResolvedValue({
        id: 'b-1',
        accountId: 'acc-1',
        status: 'COMPLETED',
        account: { email: 'buyer@example.com' },
      } as never);
      prisma.warrantyRecord.create.mockResolvedValue({ id: 'warranty-1' } as never);

      await service.issue({ bookingId: 'b-1' }, actorEmail);

      expect(prisma.warrantyRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ termMonths: 12 }) }),
      );
    });
  });

  describe('findOneForAccount', () => {
    it('throws ForbiddenException when the record belongs to a different account', async () => {
      const accountsService = { resolveOrCreate: jest.fn().mockResolvedValue({ id: 'acc-1' }) };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WarrantyService,
          { provide: PrismaService, useValue: prisma },
          { provide: AccountsService, useValue: accountsService },
          { provide: NotificationsService, useValue: notificationsService },
          { provide: AuditLogService, useValue: auditLogService },
        ],
      }).compile();
      const scopedService = module.get(WarrantyService);

      prisma.warrantyRecord.findUnique.mockResolvedValue({ id: 'w-1', accountId: 'someone-else' } as never);

      await expect(scopedService.findOneForAccount('sub-1', 'buyer@example.com', 'w-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
