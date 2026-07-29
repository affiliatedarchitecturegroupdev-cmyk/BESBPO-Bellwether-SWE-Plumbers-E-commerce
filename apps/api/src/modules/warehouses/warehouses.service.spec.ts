import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { WarehousesService } from './warehouses.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('WarehousesService', () => {
  let service: WarehousesService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [WarehousesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(WarehousesService);
  });

  describe('setStock', () => {
    it('throws NotFoundException for an unknown warehouse, without touching stock at all', async () => {
      prisma.warehouse.findUnique.mockResolvedValue(null);
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as never);

      await expect(service.setStock('missing-wh', 'prod-1', 10)).rejects.toThrow(NotFoundException);
      expect(prisma.warehouseStock.upsert).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown product', async () => {
      prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1' } as never);
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.setStock('wh-1', 'missing-prod', 10)).rejects.toThrow(NotFoundException);
      expect(prisma.warehouseStock.upsert).not.toHaveBeenCalled();
    });

    it('recomputes Product.stockQty as the sum across every warehouse, not just the one just set', async () => {
      prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1' } as never);
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as never);
      prisma.warehouseStock.upsert.mockResolvedValue({
        warehouseId: 'wh-1',
        productId: 'prod-1',
        quantity: 30,
      } as never);
      prisma.warehouseStock.aggregate.mockResolvedValue({ _sum: { quantity: 45 } } as never);

      await service.setStock('wh-1', 'prod-1', 30);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stockQty: 45 },
      });
    });

    it('sets Product.stockQty to zero, not null or undefined, when no warehouse stock exists at all', async () => {
      prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1' } as never);
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as never);
      prisma.warehouseStock.upsert.mockResolvedValue({
        warehouseId: 'wh-1',
        productId: 'prod-1',
        quantity: 0,
      } as never);
      prisma.warehouseStock.aggregate.mockResolvedValue({ _sum: { quantity: null } } as never);

      await service.setStock('wh-1', 'prod-1', 0);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stockQty: 0 },
      });
    });

    it('runs the upsert and the aggregate recompute inside a single transaction', async () => {
      prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1' } as never);
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as never);
      prisma.warehouseStock.upsert.mockResolvedValue({} as never);
      prisma.warehouseStock.aggregate.mockResolvedValue({ _sum: { quantity: 10 } } as never);

      await service.setStock('wh-1', 'prod-1', 10);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStockForProduct', () => {
    it('shows every warehouse, including ones with no explicit stock row, as an implicit zero', async () => {
      prisma.warehouse.findMany.mockResolvedValue([
        { id: 'wh-1', name: 'Durban' },
        { id: 'wh-2', name: 'Johannesburg' },
      ] as never);
      prisma.warehouseStock.findMany.mockResolvedValue([{ warehouseId: 'wh-1', quantity: 20 }] as never);

      const result = await service.getStockForProduct('prod-1');

      expect(result).toEqual([
        { warehouse: { id: 'wh-1', name: 'Durban' }, quantity: 20 },
        { warehouse: { id: 'wh-2', name: 'Johannesburg' }, quantity: 0 },
      ]);
    });
  });
});
