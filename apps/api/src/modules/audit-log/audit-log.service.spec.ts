import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy } from 'jest-mock-extended';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AuditLogService);
  });

  describe('record', () => {
    it('writes the entry with the given fields', async () => {
      prisma.auditLog.create.mockResolvedValue({} as never);

      await service.record({
        actorEmail: 'admin@bellwetherswe.co.za',
        action: 'order.status_updated',
        targetType: 'Order',
        targetId: 'order-1',
        metadata: { from: 'CONFIRMED', to: 'DISPATCHED' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorEmail: 'admin@bellwetherswe.co.za',
          action: 'order.status_updated',
          targetType: 'Order',
          targetId: 'order-1',
          metadata: { from: 'CONFIRMED', to: 'DISPATCHED' },
        },
      });
    });

    it('does not throw when the write fails — the calling action already succeeded and must not be reported as failed', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('db unreachable'));

      await expect(
        service.record({ actorEmail: 'admin@x.com', action: 'x', targetType: 'X', targetId: '1' }),
      ).resolves.not.toThrow();
    });
  });

  describe('findForTarget', () => {
    it('filters by both targetType and targetId', async () => {
      prisma.auditLog.findMany.mockResolvedValue([] as never);

      await service.findForTarget('Order', 'order-1');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { targetType: 'Order', targetId: 'order-1' } }),
      );
    });
  });
});
