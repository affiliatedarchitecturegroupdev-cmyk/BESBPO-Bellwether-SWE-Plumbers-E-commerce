import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BackInStockService } from '../back-in-stock/back-in-stock.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto, ProductSortOrder } from './dto/query-products.dto';
import { CreateVariantGroupDto } from './dto/create-variant-group.dto';

export interface PaginatedProducts {
  items: (Prisma.ProductGetPayload<{ include: { category: true; images: true } }> & {
    averageRating: number | null;
    reviewCount: number;
  })[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RecommendedProduct {
  productId: string;
  name: string;
  slug: string;
  reason: string;
}

const IMAGE_ORDER = { orderBy: { sortOrder: 'asc' as const } };

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly backInStockService: BackInStockService,
  ) {}

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findFirst({
      where: { OR: [{ sku: dto.sku }, { slug: dto.slug }] },
    });
    if (existing) {
      throw new ConflictException(`Product with this SKU or slug already exists`);
    }
    if (dto.variantGroupId) {
      await this.assertVariantGroupExists(dto.variantGroupId);
    }
    return this.prisma.product.create({ data: dto });
  }

  async findAll(query: QueryProductsDto): Promise<PaginatedProducts> {
    const { search, categoryId, page, pageSize, minPrice, maxPrice, inStockOnly, sortBy, brand } = query;
    const skip = (page - 1) * pageSize;

    // Plain filtering (category, price range, stock, brand, pagination)
    // uses Prisma's query builder. Full-text search bypasses it for a raw
    // query against the tsvector column + pg_trgm fallback, since Prisma
    // can't express `@@` ranking — but every other filter still applies
    // in that path too (see searchByText), not just this one.
    if (search && search.trim().length > 0) {
      return this.searchByText(search.trim(), query);
    }

    const where: Prisma.ProductWhereInput = {
      ...(categoryId ? { categoryId } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? { retailPrice: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
        : {}),
      ...(inStockOnly ? { stockQty: { gt: 0 } } : {}),
      ...(brand ? { brand } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { category: true, images: IMAGE_ORDER },
        skip,
        take: pageSize,
        orderBy: this.resolveSortOrder(sortBy),
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items: await this.attachRatings(items), page, pageSize, total };
  }

  // Feeds the homepage's "Popular Products" section — real popularity
  // (order-history quantity sold), not just whichever products the
  // default listing order happens to surface. Same underlying query
  // shape as AnalyticsService.getPopularProducts (order line items
  // grouped by product, summed quantity, descending), but returns full
  // Product records (category, images, ratings) rather than that
  // method's lighter {productId, name, sku, quantitySold} shape, since
  // this feeds a real ProductCard grid, not an admin analytics table.
  // Falls back to the newest products when there's no order history at
  // all yet (a brand-new store, or a period with zero sales) — "popular"
  // genuinely has no meaning with zero real signal to base it on.
  async findPopular(limit: number): Promise<PaginatedProducts['items']> {
    const grouped = await this.prisma.orderLineItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) {
      const fallback = await this.findAll({
        page: 1,
        pageSize: limit,
        sortBy: ProductSortOrder.NEWEST,
      } as QueryProductsDto);
      return fallback.items;
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      include: { category: true, images: IMAGE_ORDER },
    });
    const productsById = new Map(products.map((p) => [p.id, p]));

    // Preserves popularity order — Prisma's findMany WHERE IN doesn't
    // guarantee result order matches the input array, same reasoning
    // AnalyticsService.getPopularProducts' own comment already states.
    const ordered = grouped
      .map((g) => productsById.get(g.productId))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);

    return this.attachRatings(ordered);
  }

  // Feeds the homepage's "Top Rated" section. A minimum review count
  // (default 3) matters here for real reasons, not just tidiness: a
  // single 5-star review would otherwise outrank a product with 50
  // reviews averaging 4.8 — genuinely misleading as "top rated." Unlike
  // findPopular, this doesn't need a separate attachRatings call at
  // all — the same groupBy that determines the ranking already computes
  // exactly the average/count values that method would have looked up
  // in a second query.
  async findTopRated(limit: number, minReviews = 3): Promise<PaginatedProducts['items']> {
    const grouped = await this.prisma.review.groupBy({
      by: ['productId'],
      _avg: { rating: true },
      _count: { rating: true },
      having: { rating: { _count: { gte: minReviews } } },
      orderBy: { _avg: { rating: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      include: { category: true, images: IMAGE_ORDER },
    });
    const productsById = new Map(products.map((p) => [p.id, p]));

    return grouped
      .map((g) => {
        const product = productsById.get(g.productId);
        if (!product) return undefined;
        return { ...product, averageRating: g._avg.rating, reviewCount: g._count.rating };
      })
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
  }

  // Public — feeds both the homepage's "Clearance" section (page 1, a
  // small pageSize) and the dedicated /clearance listing page (real
  // pagination) with the same method — no separate "top N" vs "full
  // list" implementation to keep in sync. Deliberately a plain filter,
  // not a candidate-detection query (see findClearanceCandidates below
  // for that) — by the time a product has a real salePrice set, an
  // admin has already reviewed and confirmed it, so this just returns
  // whatever's currently active. saleEndsAt being null OR in the future
  // both count as active — a null saleEndsAt means "on sale until
  // manually turned off," not an immediate expiry.
  async findOnSale(page: number, pageSize: number): Promise<PaginatedProducts> {
    const now = new Date();
    const where: Prisma.ProductWhereInput = {
      salePrice: { not: null },
      OR: [{ saleEndsAt: null }, { saleEndsAt: { gt: now } }],
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true, images: IMAGE_ORDER },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items: await this.attachRatings(items), page, pageSize, total };
  }

  // Admin-only — feeds a review screen, not the storefront. This is the
  // actual "smart" part of Clearance: rather than an admin picking
  // products to discount arbitrarily, this surfaces genuinely slow
  // movers — real stock sitting with real order history showing little
  // to no recent velocity — as CANDIDATES for an admin to review and
  // confirm (or reject) a sale price for. Deliberately does not
  // auto-apply a discount: a brand-new product with zero sales isn't
  // "slow," it's just new, and an unreviewed automatic discount is a
  // real risk against existing trade pricing relationships. Already-
  // on-sale products are excluded — they're not "candidates" anymore,
  // they're already a confirmed decision.
  async findClearanceCandidates(
    minStock = 20,
    windowDays = 60,
    limit = 50,
  ): Promise<PaginatedProducts['items']> {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    const recentlyOrdered = await this.prisma.orderLineItem.groupBy({
      by: ['productId'],
      where: { order: { createdAt: { gte: windowStart } } },
    });
    const recentlyOrderedIds = recentlyOrdered.map((r) => r.productId);

    const candidates = await this.prisma.product.findMany({
      where: {
        stockQty: { gte: minStock },
        salePrice: null,
        id: { notIn: recentlyOrderedIds },
      },
      orderBy: { stockQty: 'desc' },
      take: limit,
      include: { category: true, images: IMAGE_ORDER },
    });
    return this.attachRatings(candidates);
  }

  // Public — feeds both the homepage's "Trending This Week" section and
  // the dedicated /trending listing page, same method, same reasoning
  // as findOnSale above. Genuinely different signal from Best Sellers —
  // a 7-day window (not all-time) with a minimum order-count threshold
  // (default 3, same reasoning as findTopRated's minReviews: without
  // it, a single order for an obscure product would look "trending" off
  // pure noise).
  async findTrending(
    page: number,
    pageSize: number,
    windowDays = 7,
    minOrders = 3,
  ): Promise<PaginatedProducts> {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    // No simple "count of groups matching a having clause" shorthand
    // exists on Prisma's groupBy — fetches every matching group (bounded
    // naturally by the window + minOrders threshold; this was never
    // expected to be a large list) and paginates in memory, rather than
    // a second, separate raw-SQL count query for what's a genuinely
    // small result set in practice.
    const allGrouped = await this.prisma.orderLineItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      _count: { id: true },
      where: { order: { createdAt: { gte: windowStart } } },
      having: { id: { _count: { gte: minOrders } } },
      orderBy: { _sum: { quantity: 'desc' } },
    });

    const total = allGrouped.length;
    const grouped = allGrouped.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

    if (grouped.length === 0) return { items: [], page, pageSize, total };

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      include: { category: true, images: IMAGE_ORDER },
    });
    const productsById = new Map(products.map((p) => [p.id, p]));

    const ordered = grouped
      .map((g) => productsById.get(g.productId))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);

    return { items: await this.attachRatings(ordered), page, pageSize, total };
  }

  // Admin-only — feeds the low-stock alerts screen. Deliberately the
  // inverse of Clearance's real signal, not a flat "stockQty < N"
  // threshold: a product selling fast with 20 units left is a real,
  // urgent risk; a product with 20 units and zero recent sales isn't.
  // "Days of stock remaining" (current stock ÷ real recent daily sales
  // velocity) is the actual useful number, and it's what this sorts by
  // — most urgent first. Deliberately excludes already-out-of-stock
  // products (stockQty === 0) — that's a different, already-handled
  // problem (see BackInStockService), not a restock-timing one.
  // Products with zero measurable velocity in the window are also
  // excluded — with no real sales signal, "days remaining" is undefined
  // (mathematically infinite), not urgent.
  async findLowStock(
    windowDays = 30,
    daysOfStockThreshold = 14,
    limit = 50,
  ): Promise<
    { id: string; name: string; sku: string; stockQty: number; unitsSoldInWindow: number; daysOfStockRemaining: number }[]
  > {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    const velocity = await this.prisma.orderLineItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: { order: { createdAt: { gte: windowStart } } },
    });
    if (velocity.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: velocity.map((v) => v.productId) }, stockQty: { gt: 0 } },
      select: { id: true, name: true, sku: true, stockQty: true },
    });
    const productsById = new Map(products.map((p) => [p.id, p]));

    return velocity
      .map((v) => {
        const product = productsById.get(v.productId);
        if (!product) return null;

        const unitsSoldInWindow = v._sum.quantity ?? 0;
        const unitsPerDay = unitsSoldInWindow / windowDays;
        if (unitsPerDay <= 0) return null;

        const daysOfStockRemaining = product.stockQty / unitsPerDay;
        if (daysOfStockRemaining >= daysOfStockThreshold) return null;

        return { ...product, unitsSoldInWindow, daysOfStockRemaining: Math.round(daysOfStockRemaining) };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => a.daysOfStockRemaining - b.daysOfStockRemaining)
      .slice(0, limit);
  }

  // One query per PAGE of results, not one per product — a groupBy
  // against just the ids actually being returned, not every review in
  // the table. Used by both findAll and searchByText so a listing page's
  // rating always matches exactly what ReviewsSection computes on the
  // PDP for the same product (same _avg(rating) aggregation), rather
  // than two independently-drifting implementations of "average rating."
  private async attachRatings<T extends { id: string }>(
    items: T[],
  ): Promise<(T & { averageRating: number | null; reviewCount: number })[]> {
    if (items.length === 0) return [];

    const aggregates = await this.prisma.review.groupBy({
      by: ['productId'],
      where: { productId: { in: items.map((item) => item.id) } },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const byProductId = new Map(aggregates.map((agg) => [agg.productId, agg]));

    return items.map((item) => {
      const agg = byProductId.get(item.id);
      return {
        ...item,
        averageRating: agg?._avg.rating ?? null,
        reviewCount: agg?._count.rating ?? 0,
      };
    });
  }

  // RELEVANCE has no meaning without a search term (ts_rank against an
  // empty query is undefined) — falls back to NEWEST, the same default
  // this endpoint always had before sorting existed at all.
  private resolveSortOrder(sortBy?: ProductSortOrder): Prisma.ProductOrderByWithRelationInput {
    switch (sortBy) {
      case ProductSortOrder.PRICE_ASC:
        return { retailPrice: 'asc' };
      case ProductSortOrder.PRICE_DESC:
        return { retailPrice: 'desc' };
      case ProductSortOrder.NAME_ASC:
        return { name: 'asc' };
      case ProductSortOrder.NEWEST:
      case ProductSortOrder.RELEVANCE:
      case undefined:
      default:
        return { createdAt: 'desc' };
    }
  }

  // Powers the filter dropdown's brand list — only brands actually in
  // use, not a hardcoded or admin-managed list, so it never shows a
  // brand with zero matching products.
  async findDistinctBrands(): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      where: { brand: { not: null } },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    return rows.map((r) => r.brand as string);
  }

  // Feeds sitemap.ts — see the controller's own comment on why this is a
  // dedicated, unpaginated endpoint rather than a higher pageSize on
  // findAll. Slugs only, nothing else, so this stays lightweight
  // regardless of how large the catalog grows.
  async findAllSlugs(): Promise<{ slug: string }[]> {
    return this.prisma.product.findMany({ select: { slug: true } });
  }

  private async searchByText(search: string, query: QueryProductsDto): Promise<PaginatedProducts> {
    const { categoryId, page, pageSize, minPrice, maxPrice, inStockOnly, sortBy, brand } = query;
    const skip = (page - 1) * pageSize;

    // Built once, used in both the SELECT and the COUNT below — the
    // previous version of this method duplicated the WHERE clause
    // verbatim across both queries, a real risk that a filter added to
    // one would quietly not make it into the other. One shared fragment
    // instead.
    const filterFragment = Prisma.sql`
      ${categoryId ? Prisma.sql`AND p."categoryId" = ${categoryId}` : Prisma.empty}
      ${minPrice !== undefined ? Prisma.sql`AND p."retailPrice" >= ${minPrice}` : Prisma.empty}
      ${maxPrice !== undefined ? Prisma.sql`AND p."retailPrice" <= ${maxPrice}` : Prisma.empty}
      ${inStockOnly ? Prisma.sql`AND p."stockQty" > 0` : Prisma.empty}
      ${brand ? Prisma.sql`AND p.brand = ${brand}` : Prisma.empty}
    `;

    // Sorting by price/name overrides relevance ranking entirely when
    // requested — a customer who searched AND picked "price low to high"
    // wants that order, not search relevance first.
    const orderByFragment =
      sortBy === ProductSortOrder.PRICE_ASC
        ? Prisma.sql`p."retailPrice" ASC`
        : sortBy === ProductSortOrder.PRICE_DESC
          ? Prisma.sql`p."retailPrice" DESC`
          : sortBy === ProductSortOrder.NAME_ASC
            ? Prisma.sql`p.name ASC`
            : Prisma.sql`ts_rank(p.search_vector, websearch_to_tsquery('english', ${search})) DESC`;

    // Ranked full-text match (websearch_to_tsquery handles quoted phrases and
    // "-exclude" syntax) with a trigram similarity fallback for typo
    // tolerance, per prisma/manual-sql/001_product_fulltext_search.sql.
    const rows = await this.prisma.$queryRaw<
      Prisma.ProductGetPayload<{ include: { category: true } }>[]
    >`
      SELECT p.*, to_jsonb(c.*) as category
      FROM products p
      JOIN categories c ON c.id = p."categoryId"
      WHERE
        (p.search_vector @@ websearch_to_tsquery('english', ${search})
         OR p.name % ${search})
        ${filterFragment}
      ORDER BY ${orderByFragment}
      LIMIT ${pageSize} OFFSET ${skip}
    `;

    // $queryRaw can't express Prisma's `include` the way the query-builder
    // path above can — images are fetched separately (one query for all
    // rows in this page, not one per row) and attached here rather than
    // complicating the raw SQL with a JSON aggregation.
    const images =
      rows.length > 0
        ? await this.prisma.productImage.findMany({
            where: { productId: { in: rows.map((r) => r.id) } },
            orderBy: { sortOrder: 'asc' },
          })
        : [];
    const imagesByProductId = new Map<string, typeof images>();
    for (const image of images) {
      imagesByProductId.set(image.productId, [...(imagesByProductId.get(image.productId) ?? []), image]);
    }
    const items: Omit<PaginatedProducts['items'][number], 'averageRating' | 'reviewCount'>[] = rows.map((row) => ({
      ...row,
      images: imagesByProductId.get(row.id) ?? [],
    }));

    const totalResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count
      FROM products p
      WHERE
        (p.search_vector @@ websearch_to_tsquery('english', ${search})
         OR p.name % ${search})
        ${filterFragment}
    `;

    return { items: await this.attachRatings(items), page, pageSize, total: Number(totalResult[0]?.count ?? 0) };
  }

  async findOneBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { category: true, images: IMAGE_ORDER },
    });
    if (!product) {
      throw new NotFoundException(`Product '${slug}' not found`);
    }
    return product;
  }

  // Second AI-service entry point, following the exact shape SearchService
  // established for /search-rank: thin proxy, graceful fallback, 3s
  // timeout. Before this, /recommend had zero callers anywhere — same
  // "built, tested, unreachable" gap /search-rank was in (see
  // docs/AGENTS.md's search section for the fuller story on why this
  // pattern exists).
  async getRecommendations(productId: string, limit = 4): Promise<RecommendedProduct[]> {
    const aiServiceUrl = this.config.get<string>('AI_SERVICE_URL');
    if (aiServiceUrl) {
      const aiResult = await this.tryAiRecommend(aiServiceUrl, productId, limit);
      if (aiResult) return aiResult;
    }

    // Fallback: same-category products, same reasoning as SearchService's
    // fallback to plain FTS — the AI service is an enhancement layer, not
    // a hard dependency for the PDP to show *something* relevant.
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return [];

    const sameCategory = await this.prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: productId } },
      take: limit,
    });
    return sameCategory.map((p) => ({ productId: p.id, name: p.name, slug: p.slug, reason: 'same category' }));
  }

  private async tryAiRecommend(
    aiServiceUrl: string,
    productId: string,
    limit: number,
  ): Promise<RecommendedProduct[] | null> {
    try {
      const response = await fetch(`${aiServiceUrl}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, limit }),
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return null;

      const data = (await response.json()) as {
        recommendations: { product_id: string; name: string; slug: string; reason: string }[];
      };
      return data.recommendations.map((r) => ({
        productId: r.product_id,
        name: r.name,
        slug: r.slug,
        reason: r.reason,
      }));
    } catch (err) {
      this.logger.warn(`AI service /recommend call failed, falling back to same-category: ${err}`);
      return null;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product '${id}' not found`);
    }

    // The DTO's own @ValidateIf pairing (create-product.dto.ts) only sees
    // what's actually in THIS request body — a partial update sending
    // only { variantGroupId } without variantValue would pass that check
    // if the product doesn't already have one, since ValidateIf can't see
    // existing database state. Check the MERGED result instead: what the
    // product's variant fields would actually be after this update lands.
    const mergedGroupId = dto.variantGroupId !== undefined ? dto.variantGroupId : existing.variantGroupId;
    const mergedValue = dto.variantValue !== undefined ? dto.variantValue : existing.variantValue;
    if (Boolean(mergedGroupId) !== Boolean(mergedValue)) {
      throw new BadRequestException('variantGroupId and variantValue must both be set, or both cleared, together');
    }
    if (dto.variantGroupId) {
      await this.assertVariantGroupExists(dto.variantGroupId);
    }

    const updated = await this.prisma.product.update({ where: { id }, data: dto });
    await this.backInStockService.notifyIfBackInStock(id, existing.stockQty, updated.stockQty);
    return updated;
  }

  // Additive, not the plain update() method above (which would overwrite
  // stockQty with whatever absolute value is passed) — restocking is "N
  // more units arrived," and two admins restocking the same product
  // around the same time should both land, not have one overwrite the
  // other's read-then-write. Prisma's `increment` is atomic at the
  // database level, the same reasoning as every other stock/credit
  // mutation in this codebase.
  async restock(id: string, quantity: number) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product '${id}' not found`);
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data: { stockQty: { increment: quantity } },
    });
    await this.backInStockService.notifyIfBackInStock(id, existing.stockQty, updated.stockQty);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.assertExists(id);
    await this.assertNotReferenced(id);
    await this.prisma.product.delete({ where: { id } });
  }

  private async assertExists(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product '${id}' not found`);
    }
  }

  private async assertVariantGroupExists(variantGroupId: string): Promise<void> {
    const group = await this.prisma.productVariantGroup.findUnique({ where: { id: variantGroupId } });
    if (!group) {
      throw new NotFoundException(`Variant group '${variantGroupId}' not found`);
    }
  }

  // Powers the PDP's size selector — every OTHER product sharing this
  // one's variant group (plain navigation between real product pages,
  // not an in-place AJAX swap; see docs/AGENTS.md's variants section for
  // why that's the deliberate choice here). Returns an empty array, not
  // an error, for a product with no group at all — "no siblings" is a
  // completely normal state for most products, not something to reject.
  async getVariantSiblings(productSlug: string) {
    const product = await this.prisma.product.findUnique({ where: { slug: productSlug } });
    if (!product || !product.variantGroupId) {
      return { group: null, siblings: [] };
    }

    const [group, siblings] = await Promise.all([
      this.prisma.productVariantGroup.findUnique({ where: { id: product.variantGroupId } }),
      this.prisma.product.findMany({
        where: { variantGroupId: product.variantGroupId },
        select: { id: true, slug: true, name: true, variantValue: true, stockQty: true },
        orderBy: { variantValue: 'asc' },
      }),
    ]);

    return { group, siblings };
  }

  async findAllVariantGroups() {
    return this.prisma.productVariantGroup.findMany({ orderBy: { name: 'asc' } });
  }

  async createVariantGroup(dto: CreateVariantGroupDto) {
    return this.prisma.productVariantGroup.create({ data: dto });
  }

  // Without this, deleting a referenced product hits Postgres' foreign-key
  // constraint directly and surfaces to the caller as an unhandled 500 —
  // same class of bug CategoriesService.remove() already guards against for
  // categories; this closes the equivalent gap for products. Order line
  // items are deliberately not in this check: they snapshot productName
  // (see schema.prisma) precisely so order history survives a product being
  // removed later — bundles and carts don't have that snapshot, so those
  // still need to block deletion.
  private async assertNotReferenced(id: string): Promise<void> {
    const [bundleItemCount, cartItemCount] = await this.prisma.$transaction([
      this.prisma.bundleItem.count({ where: { productId: id } }),
      this.prisma.cartItem.count({ where: { productId: id } }),
    ]);
    if (bundleItemCount > 0 || cartItemCount > 0) {
      throw new ConflictException(
        'Cannot delete a product that is still referenced by a bundle or an active cart — remove it from those first',
      );
    }
  }
}
