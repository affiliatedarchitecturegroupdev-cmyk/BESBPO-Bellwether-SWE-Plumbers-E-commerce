import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { ProductsService } from './products.service';
import { ProductSortOrder } from './dto/query-products.dto';
import { PrismaService } from '../prisma/prisma.service';
import { BackInStockService } from '../back-in-stock/back-in-stock.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

// Not covered here: the full-text search path in findAll() (searchByText,
// using $queryRaw). Mocking a tagged-template raw query meaningfully
// requires either a real Postgres connection or accepting a mock so loose
// it wouldn't catch a real regression — that's an integration-test concern
// (see prisma/manual-sql/001_product_fulltext_search.sql), not a unit-test
// one. Everything else in this service is covered.
describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: DeepMockProxy<PrismaService>;
  let backInStockService: { notifyIfBackInStock: jest.Mock };

  const mockProduct = {
    id: 'prod-1',
    sku: 'BSWE-TEST-001',
    slug: 'test-product',
    name: 'Test Product',
    description: null,
    categoryId: 'cat-1',
    retailPrice: 100,
    tradePrice: 80,
    stockQty: 10,
    sansCompliant: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    backInStockService = { notifyIfBackInStock: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: BackInStockService, useValue: backInStockService },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('create', () => {
    it('creates a product when the SKU and slug are both unused', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue(mockProduct as never);

      const dto = {
        sku: 'BSWE-TEST-001',
        slug: 'test-product',
        name: 'Test Product',
        categoryId: 'cat-1',
        retailPrice: 100,
        tradePrice: 80,
      };
      const result = await service.create(dto);

      expect(result).toEqual(mockProduct);
      expect(prisma.product.create).toHaveBeenCalledWith({ data: dto });
    });

    it('throws ConflictException when the SKU or slug already exists', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct as never);

      await expect(
        service.create({
          sku: 'BSWE-TEST-001',
          slug: 'test-product',
          name: 'Test Product',
          categoryId: 'cat-1',
          retailPrice: 100,
          tradePrice: 80,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when creating with a variantGroupId that does not exist', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.productVariantGroup.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          sku: 'BSWE-TEST-002',
          slug: 'test-product-2',
          name: 'Test Product 2',
          categoryId: 'cat-1',
          retailPrice: 100,
          tradePrice: 80,
          variantGroupId: 'missing-group',
          variantValue: '15mm',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });

  describe('update — variant field consistency', () => {
    it('throws BadRequestException when clearing variantValue would leave variantGroupId set alone', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        variantGroupId: 'group-1',
        variantValue: '15mm',
      } as never);

      await expect(service.update('prod-1', { variantValue: null } as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when clearing variantGroupId would leave variantValue set alone', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        variantGroupId: 'group-1',
        variantValue: '15mm',
      } as never);

      await expect(service.update('prod-1', { variantGroupId: null } as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('allows clearing both variant fields together', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        variantGroupId: 'group-1',
        variantValue: '15mm',
      } as never);
      prisma.product.update.mockResolvedValue({ id: 'prod-1' } as never);

      await service.update('prod-1', { variantGroupId: null, variantValue: null } as never);

      expect(prisma.product.update).toHaveBeenCalled();
    });

    it('allows setting both variant fields together on a previously-standalone product', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        variantGroupId: null,
        variantValue: null,
      } as never);
      prisma.productVariantGroup.findUnique.mockResolvedValue({ id: 'group-1' } as never);
      prisma.product.update.mockResolvedValue({ id: 'prod-1' } as never);

      await service.update('prod-1', { variantGroupId: 'group-1', variantValue: '22mm' });

      expect(prisma.product.update).toHaveBeenCalled();
    });
  });

  describe('getVariantSiblings', () => {
    it('returns an empty siblings array, not an error, for a product with no variant group', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', variantGroupId: null } as never);

      const result = await service.getVariantSiblings('standalone-product');

      expect(result).toEqual({ group: null, siblings: [] });
      expect(prisma.productVariantGroup.findUnique).not.toHaveBeenCalled();
    });

    it('returns every product in the group, ordered by variant value', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', variantGroupId: 'group-1' } as never);
      prisma.productVariantGroup.findUnique.mockResolvedValue({
        id: 'group-1',
        name: 'Copper Pipe',
        optionLabel: 'Size',
      } as never);
      prisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', slug: 'copper-pipe-15mm', name: 'Copper Pipe 15mm', variantValue: '15mm', stockQty: 10 },
        { id: 'prod-2', slug: 'copper-pipe-22mm', name: 'Copper Pipe 22mm', variantValue: '22mm', stockQty: 5 },
      ] as never);

      const result = await service.getVariantSiblings('copper-pipe-15mm');

      expect(result.group).toEqual(expect.objectContaining({ name: 'Copper Pipe', optionLabel: 'Size' }));
      expect(result.siblings).toHaveLength(2);
    });
  });

  describe('findOneBySlug', () => {
    it('returns the product when it exists', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct as never);

      const result = await service.findOneBySlug('test-product');

      expect(result).toEqual(mockProduct);
    });

    it('throws NotFoundException when no product matches the slug', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOneBySlug('does-not-exist')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the product when it exists and nothing references it', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct as never);
      prisma.bundleItem.count.mockResolvedValue(0);
      prisma.cartItem.count.mockResolvedValue(0);

      await service.remove('prod-1');

      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
    });

    it('throws NotFoundException before checking references, if the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(prisma.bundleItem.count).not.toHaveBeenCalled();
    });

    it('throws ConflictException instead of deleting, when a bundle references the product', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct as never);
      prisma.bundleItem.count.mockResolvedValue(2);
      prisma.cartItem.count.mockResolvedValue(0);

      await expect(service.remove('prod-1')).rejects.toThrow(ConflictException);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException instead of deleting, when an active cart references the product', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct as never);
      prisma.bundleItem.count.mockResolvedValue(0);
      prisma.cartItem.count.mockResolvedValue(1);

      await expect(service.remove('prod-1')).rejects.toThrow(ConflictException);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });
  });

  describe('getRecommendations', () => {
    it('falls back to same-category products when AI_SERVICE_URL is not configured', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct as never);
      prisma.product.findMany.mockResolvedValue([
        { id: 'prod-2', name: 'Other Product', slug: 'other-product' },
      ] as never);

      const result = await service.getRecommendations('prod-1');

      expect(result).toEqual([
        { productId: 'prod-2', name: 'Other Product', slug: 'other-product', reason: 'same category' },
      ]);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat-1', id: { not: 'prod-1' } },
        take: 4,
      });
    });

    it('returns an empty array when the product itself does not exist (fallback path)', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      const result = await service.getRecommendations('missing');
      expect(result).toEqual([]);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });
  });

  describe('restock', () => {
    it('increments stockQty atomically rather than overwriting it', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as never);
      prisma.product.update.mockResolvedValue({ id: 'prod-1', stockQty: 25 } as never);

      await service.restock('prod-1', 10);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stockQty: { increment: 10 } },
      });
    });

    it('throws NotFoundException for an unknown product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.restock('missing', 10)).rejects.toThrow(NotFoundException);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('calls notifyIfBackInStock with the real previous and new stockQty, not just a boolean', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', stockQty: 0 } as never);
      prisma.product.update.mockResolvedValue({ id: 'prod-1', stockQty: 10 } as never);

      await service.restock('prod-1', 10);

      expect(backInStockService.notifyIfBackInStock).toHaveBeenCalledWith('prod-1', 0, 10);
    });
  });

  describe('findAll — filters and sorting', () => {
    beforeEach(() => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);
    });

    it('combines category, price range, in-stock, and brand into a single where clause', async () => {
      await service.findAll({
        page: 1,
        pageSize: 24,
        categoryId: 'cat-1',
        minPrice: 50,
        maxPrice: 200,
        inStockOnly: true,
        brand: 'Cobra',
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            categoryId: 'cat-1',
            retailPrice: { gte: 50, lte: 200 },
            stockQty: { gt: 0 },
            brand: 'Cobra',
          },
        }),
      );
    });

    it('omits stockQty from the where clause entirely when inStockOnly is not set — not filtering to zero-stock only', async () => {
      await service.findAll({ page: 1, pageSize: 24 });

      const [call] = prisma.product.findMany.mock.calls;
      expect(call[0].where).not.toHaveProperty('stockQty');
    });

    it.each([
      [ProductSortOrder.PRICE_ASC, { retailPrice: 'asc' }],
      [ProductSortOrder.PRICE_DESC, { retailPrice: 'desc' }],
      [ProductSortOrder.NAME_ASC, { name: 'asc' }],
      [ProductSortOrder.NEWEST, { createdAt: 'desc' }],
      [undefined, { createdAt: 'desc' }],
    ])('resolves sortBy=%s to the correct Prisma orderBy', async (sortBy, expectedOrderBy) => {
      await service.findAll({ page: 1, pageSize: 24, sortBy });

      expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: expectedOrderBy }));
    });

    it('delegates to the full-text search path when a non-empty search term is given, not the plain query builder', async () => {
      prisma.$queryRaw.mockResolvedValue([] as never);

      await service.findAll({ page: 1, pageSize: 24, search: 'copper pipe' });

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });

    it('does not delegate to full-text search for a whitespace-only search term', async () => {
      await service.findAll({ page: 1, pageSize: 24, search: '   ' });

      expect(prisma.product.findMany).toHaveBeenCalled();
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('findAll — rating attachment', () => {
    it('attaches averageRating and reviewCount from a single bulk groupBy query, not one per product', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }, { id: 'prod-2' }] as never);
      prisma.product.count.mockResolvedValue(2);
      prisma.review.groupBy.mockResolvedValue([
        { productId: 'prod-1', _avg: { rating: 4.5 }, _count: { rating: 10 } },
      ] as never);

      const result = await service.findAll({ page: 1, pageSize: 24 });

      expect(prisma.review.groupBy).toHaveBeenCalledTimes(1);
      expect(prisma.review.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { productId: { in: ['prod-1', 'prod-2'] } } }),
      );
      expect(result.items).toEqual([
        expect.objectContaining({ id: 'prod-1', averageRating: 4.5, reviewCount: 10 }),
        expect.objectContaining({ id: 'prod-2', averageRating: null, reviewCount: 0 }),
      ]);
    });

    it('skips the groupBy query entirely for an empty result page', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll({ page: 1, pageSize: 24 });

      expect(prisma.review.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('findDistinctBrands', () => {
    it('excludes null brands and returns plain strings', async () => {
      prisma.product.findMany.mockResolvedValue([{ brand: 'Cobra' }, { brand: 'DPI' }] as never);

      const result = await service.findDistinctBrands();

      expect(result).toEqual(['Cobra', 'DPI']);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { brand: { not: null } } }),
      );
    });
  });

  describe('findAllSlugs', () => {
    it('returns every product slug, unpaginated — the fix for sitemap.ts silently having zero URLs', async () => {
      prisma.product.findMany.mockResolvedValue([{ slug: 'product-a' }, { slug: 'product-b' }] as never);

      const result = await service.findAllSlugs();

      expect(result).toEqual([{ slug: 'product-a' }, { slug: 'product-b' }]);
      // Selects only slug — no pricing/stock/description — so this stays
      // lightweight regardless of how large the catalog grows, unlike
      // findAll's own paginated, full-record query.
      expect(prisma.product.findMany).toHaveBeenCalledWith({ select: { slug: true } });
    });
  });

  describe('findPopular', () => {
    it('orders results by real order-history popularity, not the order product records happen to come back in', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([
        { productId: 'prod-2', _sum: { quantity: 50 } },
        { productId: 'prod-1', _sum: { quantity: 30 } },
      ] as never);
      // Deliberately returned in the OPPOSITE order from the groupBy
      // result, to prove findPopular doesn't just trust findMany's own
      // ordering — the same "WHERE IN doesn't guarantee order" reasoning
      // AnalyticsService.getPopularProducts already documents.
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }, { id: 'prod-2' }] as never);
      prisma.review.groupBy.mockResolvedValue([]);

      const result = await service.findPopular(8);

      expect(result.map((p) => p.id)).toEqual(['prod-2', 'prod-1']);
    });

    it('falls back to the newest products when there is no order history at all yet', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }] as never);
      prisma.product.count.mockResolvedValue(1);
      prisma.review.groupBy.mockResolvedValue([]);

      const result = await service.findPopular(8);

      expect(result).toHaveLength(1);
      // Fell through to findAll's own query path, not a second,
      // separate "recent products" query — one one already-correct code
      // path reused, not a new one invented for this fallback case.
      expect(prisma.product.count).toHaveBeenCalled();
    });

    it('excludes a product ID from order history whose product record no longer exists', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([
        { productId: 'deleted-product', _sum: { quantity: 100 } },
        { productId: 'prod-1', _sum: { quantity: 20 } },
      ] as never);
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }] as never);
      prisma.review.groupBy.mockResolvedValue([]);

      const result = await service.findPopular(8);

      expect(result.map((p) => p.id)).toEqual(['prod-1']);
    });
  });

  describe('findTopRated', () => {
    it('passes the minimum review threshold through as a having clause, not an in-memory filter', async () => {
      prisma.review.groupBy.mockResolvedValue([]);

      await service.findTopRated(8, 5);

      expect(prisma.review.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ having: { rating: { _count: { gte: 5 } } } }),
      );
    });

    it('defaults the minimum review threshold to 3 when not specified — a single 5-star review should never outrank a well-reviewed product', async () => {
      prisma.review.groupBy.mockResolvedValue([]);
      await service.findTopRated(8);
      expect(prisma.review.groupBy).toHaveBeenCalledWith(expect.objectContaining({ having: { rating: { _count: { gte: 3 } } } }));
    });

    it('returns an empty array, not an error, when nothing meets the review threshold', async () => {
      prisma.review.groupBy.mockResolvedValue([]);
      const result = await service.findTopRated(8);
      expect(result).toEqual([]);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });

    it('attaches averageRating/reviewCount directly from the same groupBy that determined the ranking, without a second ratings query', async () => {
      prisma.review.groupBy.mockResolvedValue([
        { productId: 'prod-1', _avg: { rating: 4.8 }, _count: { rating: 40 } },
      ] as never);
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }] as never);

      const result = await service.findTopRated(8);

      expect(result[0]).toEqual(expect.objectContaining({ id: 'prod-1', averageRating: 4.8, reviewCount: 40 }));
    });

    it('preserves rating-descending order from the groupBy, not the order product records happen to come back in', async () => {
      prisma.review.groupBy.mockResolvedValue([
        { productId: 'prod-2', _avg: { rating: 4.9 }, _count: { rating: 10 } },
        { productId: 'prod-1', _avg: { rating: 4.5 }, _count: { rating: 20 } },
      ] as never);
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }, { id: 'prod-2' }] as never);

      const result = await service.findTopRated(8);

      expect(result.map((p) => p.id)).toEqual(['prod-2', 'prod-1']);
    });
  });

  describe('findOnSale', () => {
    it('queries for an active sale — salePrice set AND (saleEndsAt null OR still in the future)', async () => {
      prisma.$transaction.mockResolvedValue([[], 0] as never);

      await service.findOnSale(1, 8);

      const [call] = prisma.product.findMany.mock.calls;
      expect(call[0].where).toEqual(
        expect.objectContaining({
          salePrice: { not: null },
          OR: [{ saleEndsAt: null }, { saleEndsAt: { gt: expect.any(Date) } }],
        }),
      );
    });

    it('paginates correctly — page 2 skips the first page worth of results', async () => {
      prisma.$transaction.mockResolvedValue([[], 0] as never);

      await service.findOnSale(2, 8);

      const [call] = prisma.product.findMany.mock.calls;
      expect(call[0].skip).toBe(8);
      expect(call[0].take).toBe(8);
    });

    it('returns the real total count alongside the page of items, not just the page length — the whole point of a real "see all" page', async () => {
      prisma.$transaction.mockResolvedValue([[{ id: 'prod-1' }], 34] as never);
      prisma.review.groupBy.mockResolvedValue([]);

      const result = await service.findOnSale(1, 8);

      expect(result.total).toBe(34);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findClearanceCandidates', () => {
    it('excludes products with ANY order activity in the window, not just low activity', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([{ productId: 'recently-ordered' }] as never);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findClearanceCandidates(20, 60);

      const [call] = prisma.product.findMany.mock.calls;
      expect(call[0].where.id).toEqual({ notIn: ['recently-ordered'] });
    });

    it('excludes products that already have a salePrice set — not candidates, already a confirmed decision', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findClearanceCandidates();

      const [call] = prisma.product.findMany.mock.calls;
      expect(call[0].where.salePrice).toBeNull();
    });

    it('only considers products at or above the minimum stock threshold', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findClearanceCandidates(50, 60);

      const [call] = prisma.product.findMany.mock.calls;
      expect(call[0].where.stockQty).toEqual({ gte: 50 });
    });
  });

  describe('findTrending', () => {
    it('applies a minimum order-count threshold via a having clause — a single order should not look "trending"', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([]);

      await service.findTrending(1, 8, 7, 5);

      expect(prisma.orderLineItem.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ having: { id: { _count: { gte: 5 } } } }),
      );
    });

    it('windows to the recent period only, not all-time — a genuinely different signal from Best Sellers', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([]);

      await service.findTrending(1, 8, 7);

      const [call] = prisma.orderLineItem.groupBy.mock.calls[0];
      expect(call.where.order.createdAt.gte).toBeInstanceOf(Date);
    });

    it('returns an empty page (not an error) when nothing meets the threshold in the window', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([]);
      const result = await service.findTrending(1, 8);
      expect(result).toEqual({ items: [], page: 1, pageSize: 8, total: 0 });
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });

    it('preserves velocity-descending order from the groupBy, not the order product records happen to come back in', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([
        { productId: 'prod-2', _sum: { quantity: 40 }, _count: { id: 8 } },
        { productId: 'prod-1', _sum: { quantity: 15 }, _count: { id: 3 } },
      ] as never);
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }, { id: 'prod-2' }] as never);
      prisma.review.groupBy.mockResolvedValue([]);

      const result = await service.findTrending(1, 8);

      expect(result.items.map((p) => p.id)).toEqual(['prod-2', 'prod-1']);
    });

    it('paginates the in-memory grouped result — page 2 with pageSize 1 returns only the second-ranked product', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([
        { productId: 'prod-2', _sum: { quantity: 40 }, _count: { id: 8 } },
        { productId: 'prod-1', _sum: { quantity: 15 }, _count: { id: 3 } },
      ] as never);
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }] as never);
      prisma.review.groupBy.mockResolvedValue([]);

      const result = await service.findTrending(2, 1);

      expect(result.items.map((p) => p.id)).toEqual(['prod-1']);
      expect(result.total).toBe(2);
    });
  });

  describe('findLowStock', () => {
    it('returns an empty array without querying products when nothing sold in the window at all', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([]);
      const result = await service.findLowStock();
      expect(result).toEqual([]);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });

    it('excludes a product with real velocity but plenty of days of stock remaining — not urgent', async () => {
      // 30 units sold over 30 days = 1/day. 100 units in stock = 100
      // days remaining, well past the default 14-day threshold.
      prisma.orderLineItem.groupBy.mockResolvedValue([{ productId: 'prod-1', _sum: { quantity: 30 } }] as never);
      prisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'Slow but steady', sku: 'SKU-1', stockQty: 100 },
      ] as never);

      const result = await service.findLowStock(30, 14);

      expect(result).toEqual([]);
    });

    it('flags a product with real velocity and few days of stock remaining as urgent', async () => {
      // 60 units sold over 30 days = 2/day. 10 units in stock = 5 days
      // remaining — well under the 14-day threshold.
      prisma.orderLineItem.groupBy.mockResolvedValue([{ productId: 'prod-1', _sum: { quantity: 60 } }] as never);
      prisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'Fast mover', sku: 'SKU-1', stockQty: 10 },
      ] as never);

      const result = await service.findLowStock(30, 14);

      expect(result).toEqual([
        { id: 'prod-1', name: 'Fast mover', sku: 'SKU-1', stockQty: 10, unitsSoldInWindow: 60, daysOfStockRemaining: 5 },
      ]);
    });

    it('excludes an already-out-of-stock product — a different, already-handled problem', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([{ productId: 'prod-1', _sum: { quantity: 60 } }] as never);
      // stockQty: { gt: 0 } in the query itself means an out-of-stock
      // product simply never comes back from findMany.
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.findLowStock(30, 14);

      expect(result).toEqual([]);
    });

    it('sorts the most urgent (fewest days remaining) first', async () => {
      prisma.orderLineItem.groupBy.mockResolvedValue([
        { productId: 'prod-slower', _sum: { quantity: 30 } }, // 1/day, 10 stock -> 10 days
        { productId: 'prod-urgent', _sum: { quantity: 60 } }, // 2/day, 10 stock -> 5 days
      ] as never);
      prisma.product.findMany.mockResolvedValue([
        { id: 'prod-slower', name: 'Slower', sku: 'SKU-1', stockQty: 10 },
        { id: 'prod-urgent', name: 'Urgent', sku: 'SKU-2', stockQty: 10 },
      ] as never);

      const result = await service.findLowStock(30, 14);

      expect(result.map((p) => p.id)).toEqual(['prod-urgent', 'prod-slower']);
    });
  });
});
