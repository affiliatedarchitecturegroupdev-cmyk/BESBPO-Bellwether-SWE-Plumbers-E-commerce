import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { TradeCreditService } from './trade-credit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('TradeCreditService', () => {
  let service: TradeCreditService;
  let prisma: DeepMockProxy<PrismaService>;
  let accountsService: { resolveOrCreate: jest.Mock };
  let auditLogService: { record: jest.Mock };

  const actorEmail = 'admin@bellwetherswe.co.za';

  beforeEach(async () => {
    prisma = createPrismaMock();
    accountsService = { resolveOrCreate: jest.fn() };
    auditLogService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeCreditService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: accountsService },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(TradeCreditService);
  });

  describe('create', () => {
    it('throws NotFoundException when the target account does not exist', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ accountId: 'acc-1', creditPath: 'INTERNAL_INCIDENTAL', creditLimit: 50000 }, actorEmail),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the account already has a trade credit account', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: 'acc-1' } as never);
      prisma.tradeCreditAccount.findUnique.mockResolvedValue({ id: 'existing' } as never);
      await expect(
        service.create({ accountId: 'acc-1', creditPath: 'INTERNAL_INCIDENTAL', creditLimit: 50000 }, actorEmail),
      ).rejects.toThrow(ConflictException);
    });

    it('sets approvedAt to the current time on creation and records an audit entry', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: 'acc-1' } as never);
      prisma.tradeCreditAccount.findUnique.mockResolvedValue(null);
      prisma.tradeCreditAccount.create.mockResolvedValue({ id: 'tca-1' } as never);

      await service.create({ accountId: 'acc-1', creditPath: 'INTERNAL_INCIDENTAL', creditLimit: 50000 }, actorEmail);

      expect(prisma.tradeCreditAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ approvedAt: expect.any(Date) }) }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorEmail, action: 'trade_credit.account_created', targetId: 'tca-1' }),
      );
    });
  });

  describe('recordDrawdown', () => {
    it('throws BadRequestException when the drawdown would exceed the credit limit', async () => {
      prisma.tradeCreditAccount.findUnique.mockResolvedValue({ id: 'tca-1' } as never);
      // $executeRaw's WHERE clause (creditUsed + amount <= creditLimit)
      // matched zero rows — simulating "this account is already at or near
      // its limit" without needing a real Postgres connection to evaluate
      // the actual arithmetic.
      prisma.$executeRaw.mockResolvedValue(0);

      await expect(service.recordDrawdown('tca-1', { amount: 10000 }, actorEmail)).rejects.toThrow(
        BadRequestException,
      );
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it('returns the updated account and records an audit entry when the drawdown fits within the limit', async () => {
      prisma.tradeCreditAccount.findUnique.mockResolvedValue({ id: 'tca-1' } as never);
      prisma.$executeRaw.mockResolvedValue(1);
      prisma.tradeCreditAccount.findUniqueOrThrow.mockResolvedValue({ id: 'tca-1', creditUsed: 5000 } as never);

      const result = await service.recordDrawdown('tca-1', { amount: 5000 }, actorEmail);

      expect(result.creditUsed).toBe(5000);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorEmail, action: 'trade_credit.drawdown', targetId: 'tca-1' }),
      );
    });

    it('throws NotFoundException before attempting the update, if the account does not exist', async () => {
      prisma.tradeCreditAccount.findUnique.mockResolvedValue(null);
      await expect(service.recordDrawdown('missing', { amount: 100 }, actorEmail)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('recordRepayment', () => {
    it('throws BadRequestException when the repayment exceeds the outstanding balance', async () => {
      prisma.tradeCreditAccount.findUnique.mockResolvedValue({ id: 'tca-1' } as never);
      // updateMany's WHERE (creditUsed >= amount) matched nothing.
      prisma.tradeCreditAccount.updateMany.mockResolvedValue({ count: 0 } as never);

      await expect(service.recordRepayment('tca-1', { amount: 999999 }, actorEmail)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns the updated account and records an audit entry when the repayment is valid', async () => {
      prisma.tradeCreditAccount.findUnique.mockResolvedValue({ id: 'tca-1' } as never);
      prisma.tradeCreditAccount.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.tradeCreditAccount.findUniqueOrThrow.mockResolvedValue({ id: 'tca-1', creditUsed: 0 } as never);

      const result = await service.recordRepayment('tca-1', { amount: 5000 }, actorEmail);

      expect(result.creditUsed).toBe(0);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorEmail, action: 'trade_credit.repayment', targetId: 'tca-1' }),
      );
    });
  });

  describe('findMine', () => {
    it('throws NotFoundException when the account has no trade credit account', async () => {
      accountsService.resolveOrCreate.mockResolvedValue({ id: 'acc-1' });
      prisma.tradeCreditAccount.findUnique.mockResolvedValue(null);

      await expect(service.findMine('sub-1', 'buyer@example.com')).rejects.toThrow(NotFoundException);
    });
  });
});
