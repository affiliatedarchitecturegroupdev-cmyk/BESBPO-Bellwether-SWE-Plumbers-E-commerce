import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RevenueOverTimeDto } from './dto/revenue-over-time.dto';
import { PopularProductsDto } from './dto/popular-products.dto';

// Same reasoning as ReviewsService.VERIFIED_PURCHASE_STATUSES: only
// orders that were actually paid for count as real revenue. PENDING
// (never paid), CANCELLED, and REFUNDED are deliberately excluded — a
// refunded order briefly passed through CONFIRMED, but counting it as
// revenue would overstate what the business actually kept.
const REVENUE_STATUSES = ['CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'];

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
}

export interface RevenueBucket {
  day: string; // ISO date, e.g. "2026-07-23"
  revenue: number;
  orderCount: number;
}

export interface PopularProduct {
  productId: string;
  name: string;
  sku: string;
  quantitySold: number;
}

export interface ClearanceSummary {
  activeCount: number;
  // Sum of (retailPrice - salePrice) * stockQty across every currently
  // active clearance item — the real discount value currently live on
  // the storefront, not just a count. "Active" uses the exact same
  // check as ProductsService.findOnSale (salePrice set AND saleEndsAt
  // null or still in the future) — deliberately not re-implemented
  // slightly differently here.
  totalPotentialSavings: number;
}

export interface TradeApplicationFunnel {
  pending: number;
  approved: number;
  rejected: number;
  // null (not 0) when nothing has been reviewed yet — a 0% approval
  // rate reads very differently from "no data yet," and conflating them
  // would be misleading to whoever's looking at this dashboard.
  approvalRate: number | null;
}

export interface BundleCatalogSummary {
  totalBundles: number;
  bySector: Record<string, number>;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<AnalyticsSummary> {
    const [revenueAgg, statusCounts] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: { in: REVENUE_STATUSES } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.groupBy({ by: ['status'], _count: true }),
    ]);

    const totalRevenue = Number(revenueAgg._sum.total ?? 0);
    const totalOrders = revenueAgg._count;
    const ordersByStatus = Object.fromEntries(statusCounts.map((row) => [row.status, row._count]));

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      ordersByStatus,
    };
  }

  // Raw SQL, not the query builder — grouping by calendar day (not exact
  // timestamp) needs DATE_TRUNC, which Prisma's groupBy can't express
  // directly on a DateTime column. The cutoff is computed in JS and
  // passed as a literal Date, not built as SQL interval arithmetic, to
  // sidestep any ambiguity in how a parameterized INTERVAL gets
  // interpreted.
  async getRevenueOverTime(query: RevenueOverTimeDto): Promise<RevenueBucket[]> {
    const cutoff = new Date(Date.now() - query.days * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.$queryRaw<{ day: Date; revenue: number; order_count: bigint }[]>`
      SELECT
        DATE_TRUNC('day', "createdAt")::date as day,
        SUM(total)::float as revenue,
        COUNT(*)::int as order_count
      FROM orders
      WHERE status = ANY(${REVENUE_STATUSES})
        AND "createdAt" >= ${cutoff}
      GROUP BY day
      ORDER BY day ASC
    `;

    return rows.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      revenue: row.revenue,
      orderCount: Number(row.order_count),
    }));
  }

  async getPopularProducts(query: PopularProductsDto): Promise<PopularProduct[]> {
    const grouped = await this.prisma.orderLineItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: query.limit,
    });

    if (grouped.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
    });
    const productsById = new Map(products.map((p) => [p.id, p]));

    // Preserves the popularity order from groupBy — Prisma's findMany
    // WHERE IN doesn't guarantee result order matches the input array, so
    // this can't just zip the two arrays together positionally.
    return grouped
      .map((g) => {
        const product = productsById.get(g.productId);
        if (!product) return null; // a product that's since been deleted but still has historical order line items
        return {
          productId: g.productId,
          name: product.name,
          sku: product.sku,
          quantitySold: g._sum.quantity ?? 0,
        };
      })
      .filter((p): p is PopularProduct => p !== null);
  }

  // Feeds the admin dashboard — a gap found directly in Gap Analysis V:
  // Clearance, trade applications, and bundles each already have their
  // own real admin screen, but none of that was ever surfaced together
  // where an admin reviewing overall business health would look. Not
  // new data collection, just bringing together what already exists.
  async getClearanceSummary(): Promise<ClearanceSummary> {
    const now = new Date();
    const activeClearance = await this.prisma.product.findMany({
      where: {
        salePrice: { not: null },
        OR: [{ saleEndsAt: null }, { saleEndsAt: { gt: now } }],
      },
      select: { retailPrice: true, salePrice: true, stockQty: true },
    });

    const totalPotentialSavings = activeClearance.reduce((sum, p) => {
      const discount = Number(p.retailPrice) - Number(p.salePrice);
      return sum + discount * p.stockQty;
    }, 0);

    return { activeCount: activeClearance.length, totalPotentialSavings };
  }

  async getTradeApplicationFunnel(): Promise<TradeApplicationFunnel> {
    const counts = await this.prisma.tradeAccountApplication.groupBy({ by: ['status'], _count: true });
    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));
    const pending = byStatus.PENDING ?? 0;
    const approved = byStatus.APPROVED ?? 0;
    const rejected = byStatus.REJECTED ?? 0;
    const reviewed = approved + rejected;

    return { pending, approved, rejected, approvalRate: reviewed > 0 ? approved / reviewed : null };
  }

  // Deliberately a catalog-completeness count, NOT a sales/performance
  // metric — there is no bundle-price checkout mechanism anywhere in
  // this codebase (a real, stated scope boundary: a Bundle is an
  // admin-curated list of products with no way to track whether it was
  // ever actually purchased as a bundle). Calling this "bundle
  // performance" would imply sales data that doesn't exist; this is
  // honestly just "how many bundles exist, by sector."
  async getBundleCatalogSummary(): Promise<BundleCatalogSummary> {
    const bundles = await this.prisma.bundle.groupBy({ by: ['sector'], _count: true });
    const bySector = Object.fromEntries(bundles.map((b) => [b.sector, b._count]));
    const totalBundles = bundles.reduce((sum, b) => sum + b._count, 0);

    return { totalBundles, bySector };
  }
}
