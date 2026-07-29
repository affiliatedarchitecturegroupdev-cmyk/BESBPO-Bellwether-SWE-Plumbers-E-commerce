import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { PricingAdminService } from './pricing-admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('PricingAdminService', () => {
  let service: PricingAdminService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingAdminService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PricingAdminService);
  });

  describe('createPriceBookEntry', () => {
    it('throws NotFoundException when a productId is given but does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(
        service.createPriceBookEntry({
          sector: 'Residential',
          serviceCode: 'PIPE_REPAIR',
          productId: 'missing',
          baseLaborRate: 450,
          unit: 'per_hour',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.priceBookEntry.create).not.toHaveBeenCalled();
    });

    it('creates the entry without checking a product when no productId is given at all', async () => {
      prisma.priceBookEntry.create.mockResolvedValue({ id: 'entry-1' } as never);

      await service.createPriceBookEntry({
        sector: 'Residential',
        serviceCode: 'PIPE_REPAIR',
        baseLaborRate: 450,
        unit: 'per_hour',
      });

      expect(prisma.product.findUnique).not.toHaveBeenCalled();
      expect(prisma.priceBookEntry.create).toHaveBeenCalledWith({
        data: {
          sector: 'Residential',
          serviceCode: 'PIPE_REPAIR',
          productId: undefined,
          baseLaborRate: 450,
          unit: 'per_hour',
        },
      });
    });

    it('never sets an explicit effectiveFrom — always the schema default (now), not admin-supplied', async () => {
      prisma.priceBookEntry.create.mockResolvedValue({ id: 'entry-1' } as never);

      await service.createPriceBookEntry({
        sector: 'Residential',
        serviceCode: 'PIPE_REPAIR',
        baseLaborRate: 450,
        unit: 'per_hour',
      });

      const [call] = prisma.priceBookEntry.create.mock.calls;
      expect(call[0].data).not.toHaveProperty('effectiveFrom');
    });
  });

  describe('removePriceBookEntry', () => {
    it('throws NotFoundException for an entry that does not exist', async () => {
      prisma.priceBookEntry.findUnique.mockResolvedValue(null);
      await expect(service.removePriceBookEntry('missing')).rejects.toThrow(NotFoundException);
      expect(prisma.priceBookEntry.delete).not.toHaveBeenCalled();
    });
  });

  describe('createComplexityMultiplier', () => {
    it('throws ConflictException for a duplicate code', async () => {
      prisma.complexityMultiplier.findUnique.mockResolvedValue({ id: 'existing' } as never);
      await expect(
        service.createComplexityMultiplier({ code: 'AFTER_HOURS', label: 'After Hours', multiplier: 1.25 }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.complexityMultiplier.create).not.toHaveBeenCalled();
    });
  });

  describe('updateComplexityMultiplier', () => {
    it('throws NotFoundException for a multiplier that does not exist', async () => {
      prisma.complexityMultiplier.findUnique.mockResolvedValue(null);
      await expect(service.updateComplexityMultiplier('missing', { multiplier: 1.3 })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.complexityMultiplier.update).not.toHaveBeenCalled();
    });

    it('updates label/multiplier/description in place — no code field ever accepted here', async () => {
      prisma.complexityMultiplier.findUnique.mockResolvedValue({ id: 'mult-1', code: 'AFTER_HOURS' } as never);
      prisma.complexityMultiplier.update.mockResolvedValue({ id: 'mult-1' } as never);

      await service.updateComplexityMultiplier('mult-1', { multiplier: 1.3 });

      expect(prisma.complexityMultiplier.update).toHaveBeenCalledWith({
        where: { id: 'mult-1' },
        data: { multiplier: 1.3 },
      });
    });
  });

  describe('removeComplexityMultiplier', () => {
    it('throws NotFoundException for a multiplier that does not exist', async () => {
      prisma.complexityMultiplier.findUnique.mockResolvedValue(null);
      await expect(service.removeComplexityMultiplier('missing')).rejects.toThrow(NotFoundException);
      expect(prisma.complexityMultiplier.delete).not.toHaveBeenCalled();
    });
  });
});
