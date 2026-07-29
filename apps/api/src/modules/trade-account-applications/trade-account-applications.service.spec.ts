import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { TradeAccountApplicationsService } from './trade-account-applications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('TradeAccountApplicationsService', () => {
  let service: TradeAccountApplicationsService;
  let prisma: DeepMockProxy<PrismaService>;
  let accountsService: { resolveOrCreate: jest.Mock };
  let notificationsService: { queueTradeApplicationApproved: jest.Mock; queueTradeApplicationRejected: jest.Mock };

  const mockAccount = { id: 'acc-1', keycloakSub: 'sub-1', email: 'buyer@example.com', type: 'RETAIL' };

  beforeEach(async () => {
    prisma = createPrismaMock();
    accountsService = { resolveOrCreate: jest.fn().mockResolvedValue(mockAccount) };
    notificationsService = {
      queueTradeApplicationApproved: jest.fn(),
      queueTradeApplicationRejected: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeAccountApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: accountsService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(TradeAccountApplicationsService);
  });

  describe('create', () => {
    it('throws BadRequestException when the account already has trade pricing', async () => {
      accountsService.resolveOrCreate.mockResolvedValue({ ...mockAccount, type: 'TRADE' });

      await expect(
        service.create('sub-1', 'buyer@example.com', { companyName: 'Acme Plumbing' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.tradeAccountApplication.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a pending application already exists for this account', async () => {
      prisma.tradeAccountApplication.findFirst.mockResolvedValue({ id: 'app-1', status: 'PENDING' } as never);

      await expect(
        service.create('sub-1', 'buyer@example.com', { companyName: 'Acme Plumbing' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.tradeAccountApplication.create).not.toHaveBeenCalled();
    });

    it('creates a new application for an eligible account with no pending application', async () => {
      prisma.tradeAccountApplication.findFirst.mockResolvedValue(null);
      prisma.tradeAccountApplication.create.mockResolvedValue({ id: 'app-1' } as never);

      await service.create('sub-1', 'buyer@example.com', { companyName: 'Acme Plumbing' });

      expect(prisma.tradeAccountApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ accountId: 'acc-1', companyName: 'Acme Plumbing' }),
        }),
      );
    });
  });

  describe('approve', () => {
    it('throws NotFoundException for an application that does not exist', async () => {
      prisma.tradeAccountApplication.findUnique.mockResolvedValue(null);
      await expect(service.approve('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the application is not still pending', async () => {
      prisma.tradeAccountApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'APPROVED',
        accountId: 'acc-1',
        companyName: 'Acme Plumbing',
        account: { email: 'buyer@example.com' },
      } as never);

      await expect(service.approve('app-1')).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('updates BOTH the account type to TRADE and the application status in a single transaction', async () => {
      prisma.tradeAccountApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'PENDING',
        accountId: 'acc-1',
        companyName: 'Acme Plumbing',
        account: { email: 'buyer@example.com' },
      } as never);
      prisma.$transaction.mockResolvedValue([{}, { id: 'app-1', status: 'APPROVED' }] as never);

      const result = await service.approve('app-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { type: 'TRADE' },
      });
      expect(result).toEqual({ id: 'app-1', status: 'APPROVED' });
    });

    it('queues a real approval notification to the applicant, with the actual company name', async () => {
      prisma.tradeAccountApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'PENDING',
        accountId: 'acc-1',
        companyName: 'Acme Plumbing',
        account: { email: 'buyer@example.com' },
      } as never);
      prisma.$transaction.mockResolvedValue([{}, { id: 'app-1', status: 'APPROVED' }] as never);

      await service.approve('app-1');

      expect(notificationsService.queueTradeApplicationApproved).toHaveBeenCalledWith({
        recipientEmail: 'buyer@example.com',
        companyName: 'Acme Plumbing',
      });
    });
  });

  describe('reject', () => {
    it('throws ConflictException when the application is not still pending', async () => {
      prisma.tradeAccountApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'REJECTED',
        account: { email: 'buyer@example.com' },
      } as never);
      await expect(service.reject('app-1', 'No longer needed')).rejects.toThrow(ConflictException);
    });

    it('records the rejection reason and marks the application rejected', async () => {
      prisma.tradeAccountApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'PENDING',
        companyName: 'Acme Plumbing',
        account: { email: 'buyer@example.com' },
      } as never);
      prisma.tradeAccountApplication.update.mockResolvedValue({ id: 'app-1', status: 'REJECTED' } as never);

      await service.reject('app-1', 'Could not verify company registration');

      expect(prisma.tradeAccountApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-1' },
          data: expect.objectContaining({
            status: 'REJECTED',
            rejectionReason: 'Could not verify company registration',
          }),
        }),
      );
    });

    it('queues a real rejection notification with the actual reason the admin entered, not a generic message', async () => {
      prisma.tradeAccountApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'PENDING',
        companyName: 'Acme Plumbing',
        account: { email: 'buyer@example.com' },
      } as never);
      prisma.tradeAccountApplication.update.mockResolvedValue({ id: 'app-1', status: 'REJECTED' } as never);

      await service.reject('app-1', 'Could not verify company registration');

      expect(notificationsService.queueTradeApplicationRejected).toHaveBeenCalledWith({
        recipientEmail: 'buyer@example.com',
        companyName: 'Acme Plumbing',
        rejectionReason: 'Could not verify company registration',
      });
    });
  });
});
