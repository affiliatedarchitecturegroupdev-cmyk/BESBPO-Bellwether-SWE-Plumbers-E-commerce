import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy } from 'jest-mock-extended';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AnalyticsService);
  });

  describe('getSummary', () => {
    it('only counts revenue-qualifying statuses toward total revenue', async () => {
      prisma.order.aggregate.mockResolvedValue({ _sum: { total: 5000 }, _count: 10 } as never);
      prisma.order.groupBy.mockResolvedValue([
        { status: 'CONFIRMED', _count: 6 },
        { status: 'PENDING', _count: 3 },
        { status: 'CANCELLED', _count: 1 },
      ] as never);

      const result = await service.getSummary();

      expect(prisma.order.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'] } },
        }),
      );
      expect(result.totalRevenue).toBe(5000);
      expect(result.ordersByStatus).toEqual({ CONFIRMED: 6, PENDING: 3, CANCELLED: 1 });
    });

    it('computes average order value as 0, not NaN, when there are no orders yet', async () => {
      prisma.order.aggregate.mockResolvedValue({ _sum: { total: null }, _count: 0 } as never);
      prisma.order.groupBy.mockResolvedValue([] as never);

      const result = await service.getSummary();

      expect(result.averageOrderValue).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });
  });

  describe('getPopularProducts', () => {
    it('preserves popularity order even though findMany does not guarantee result order', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([
        { productId: 'prod-2', _sum: { quantity: 50 } },
        { productId: 'prod-1', _sum: { quantity: 30 } },
      ] as never);
      // Deliberately returned in a DIFFERENT order than the groupBy
      // result, to prove the mapping doesn't rely on array order matching.
      prisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'Widget A', sku: 'SKU-A' },
        { id: 'prod-2', name: 'Widget B', sku: 'SKU-B' },
      ] as never);

      const result = await service.getPopularProducts({ limit: 10 });

      expect(result.map((p) => p.productId)).toEqual(['prod-2', 'prod-1']);
      expect(result[0].quantitySold).toBe(50);
    });

    it('silently drops a product that no longer exists, rather than throwing', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([
        { productId: 'prod-deleted', _sum: { quantity: 20 } },
      ] as never);
      prisma.product.findMany.mockResolvedValue([] as never); // the product was deleted

      const result = await service.getPopularProducts({ limit: 10 });

      expect(result).toEqual([]);
    });

    it('returns an empty array without querying products, when there are no line items yet', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([] as never);

      const result = await service.getPopularProducts({ limit: 10 });

      expect(result).toEqual([]);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getClearanceSummary', () => {
    it('queries for the exact same "active" definition findOnSale uses — salePrice set AND (saleEndsAt null OR still in the future)', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.getClearanceSummary();

      const [call] = prisma.product.findMany.mock.calls;
      expect(call[0].where).toEqual(
        expect.objectContaining({
          salePrice: { not: null },
          OR: [{ saleEndsAt: null }, { saleEndsAt: { gt: expect.any(Date) } }],
        }),
      );
    });

    it('computes total potential savings as (retailPrice - salePrice) * stockQty, summed across every active item', async () => {
      prisma.product.findMany.mockResolvedValue([
        { retailPrice: 100, salePrice: 80, stockQty: 5 }, // 20 * 5 = 100
        { retailPrice: 50, salePrice: 45, stockQty: 10 }, // 5 * 10 = 50
      ] as never);

      const result = await service.getClearanceSummary();

      expect(result.activeCount).toBe(2);
      expect(result.totalPotentialSavings).toBe(150);
    });

    it('returns zero savings and a zero count when nothing is currently on clearance', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      const result = await service.getClearanceSummary();
      expect(result).toEqual({ activeCount: 0, totalPotentialSavings: 0 });
    });
  });

  describe('getTradeApplicationFunnel', () => {
    it('returns a null (not zero) approval rate when nothing has been reviewed yet — genuinely different from a 0% approval rate', async () => {
      prisma.tradeAccountApplication.groupBy.mockResolvedValue([{ status: 'PENDING', _count: 4 }] as never);

      const result = await service.getTradeApplicationFunnel();

      expect(result).toEqual({ pending: 4, approved: 0, rejected: 0, approvalRate: null });
    });

    it('computes a real approval rate once some applications have been reviewed', async () => {
      prisma.tradeAccountApplication.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: 2 },
        { status: 'APPROVED', _count: 6 },
        { status: 'REJECTED', _count: 2 },
      ] as never);

      const result = await service.getTradeApplicationFunnel();

      expect(result).toEqual({ pending: 2, approved: 6, rejected: 2, approvalRate: 0.75 });
    });
  });

  describe('getBundleCatalogSummary', () => {
    it('groups bundle counts by sector and sums them for the total', async () => {
      prisma.bundle.groupBy.mockResolvedValue([
        { sector: 'Residential', _count: 3 },
        { sector: 'Commercial', _count: 2 },
      ] as never);

      const result = await service.getBundleCatalogSummary();

      expect(result).toEqual({
        totalBundles: 5,
        bySector: { Residential: 3, Commercial: 2 },
      });
    });

    it('returns a zero total when no bundles exist yet', async () => {
      prisma.bundle.groupBy.mockResolvedValue([]);
      const result = await service.getBundleCatalogSummary();
      expect(result).toEqual({ totalBundles: 0, bySector: {} });
    });
  });
});
