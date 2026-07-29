import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { PriceTiersService } from './price-tiers.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('PriceTiersService', () => {
  let service: PriceTiersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PriceTiersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PriceTiersService);
  });

  describe('create', () => {
    it('throws NotFoundException for a product that does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ productId: 'missing', minQuantity: 10, discountPercent: 5 }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.priceTier.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a tier already exists at that exact quantity for this product', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as never);
      prisma.priceTier.findUnique.mockResolvedValue({ id: 'existing-tier' } as never);

      await expect(
        service.create({ productId: 'prod-1', minQuantity: 10, discountPercent: 5 }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.priceTier.create).not.toHaveBeenCalled();
    });

    it('creates the tier when the product exists and no tier already exists at that quantity', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as never);
      prisma.priceTier.findUnique.mockResolvedValue(null);
      prisma.priceTier.create.mockResolvedValue({ id: 'tier-1' } as never);

      await service.create({ productId: 'prod-1', minQuantity: 10, discountPercent: 5 });

      expect(prisma.priceTier.create).toHaveBeenCalledWith({
        data: { productId: 'prod-1', minQuantity: 10, discountPercent: 5 },
      });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException for a tier that does not exist', async () => {
      prisma.priceTier.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(prisma.priceTier.delete).not.toHaveBeenCalled();
    });
  });

  describe('findByProduct', () => {
    it('orders results by minQuantity ascending', async () => {
      prisma.priceTier.findMany.mockResolvedValue([]);
      await service.findByProduct('prod-1');
      expect(prisma.priceTier.findMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
        orderBy: { minQuantity: 'asc' },
      });
    });
  });
});
