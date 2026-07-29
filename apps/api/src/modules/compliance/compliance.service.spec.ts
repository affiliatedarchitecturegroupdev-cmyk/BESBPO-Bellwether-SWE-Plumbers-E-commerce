import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let prisma: DeepMockProxy<PrismaService>;
  let notificationsService: { queueCoCIssued: jest.Mock };
  let auditLogService: { record: jest.Mock };

  const actorEmail = 'admin@bellwetherswe.co.za';

  const baseDto = {
    bookingId: 'booking-1',
    pirbRegNumber: 'PIRB-12345',
    certificateNumber: 'COC-2026-001',
    documentUrl: 'https://bucket.s3.af-south-1.amazonaws.com/coc/COC-2026-001.pdf',
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    notificationsService = { queueCoCIssued: jest.fn() };
    auditLogService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: { resolveOrCreate: jest.fn() } },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(ComplianceService);
  });

  describe('issue', () => {
    it('throws NotFoundException when the booking does not exist', async () => {
      prisma.installationBooking.findUnique.mockResolvedValue(null);
      await expect(service.issue(baseDto, actorEmail)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the booking already has a CoC record', async () => {
      prisma.installationBooking.findUnique.mockResolvedValue({
        id: 'booking-1',
        account: { email: 'buyer@example.com' },
      } as never);
      prisma.coCRecord.findUnique.mockResolvedValue({ id: 'existing' } as never);

      await expect(service.issue(baseDto, actorEmail)).rejects.toThrow(ConflictException);
      expect(notificationsService.queueCoCIssued).not.toHaveBeenCalled();
    });

    it('creates the record, queues a notification, and records an audit entry', async () => {
      prisma.installationBooking.findUnique.mockResolvedValue({
        id: 'booking-1',
        account: { email: 'buyer@example.com' },
      } as never);
      prisma.coCRecord.findUnique.mockResolvedValue(null);
      prisma.coCRecord.create.mockResolvedValue({
        id: 'coc-1',
        certificateNumber: 'COC-2026-001',
        documentUrl: baseDto.documentUrl,
      } as never);

      await service.issue(baseDto, actorEmail);

      expect(notificationsService.queueCoCIssued).toHaveBeenCalledWith({
        recipientEmail: 'buyer@example.com',
        certificateNumber: 'COC-2026-001',
        documentUrl: baseDto.documentUrl,
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorEmail, action: 'compliance.coc_issued', targetId: 'coc-1' }),
      );
    });
  });

  describe('findOneForAccount', () => {
    it('throws ForbiddenException when the record belongs to a different account (via its booking)', async () => {
      const accountsService = { resolveOrCreate: jest.fn().mockResolvedValue({ id: 'acc-1' }) };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ComplianceService,
          { provide: PrismaService, useValue: prisma },
          { provide: AccountsService, useValue: accountsService },
          { provide: NotificationsService, useValue: notificationsService },
          { provide: AuditLogService, useValue: auditLogService },
        ],
      }).compile();
      const scopedService = module.get(ComplianceService);

      prisma.coCRecord.findUnique.mockResolvedValue({
        id: 'coc-1',
        booking: { accountId: 'someone-else' },
      } as never);

      await expect(scopedService.findOneForAccount('sub-1', 'buyer@example.com', 'coc-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
