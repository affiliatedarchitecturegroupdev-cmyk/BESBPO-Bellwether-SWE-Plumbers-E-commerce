import Link from 'next/link';
import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';

interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
}

interface RevenueBucket {
  day: string;
  revenue: number;
  orderCount: number;
}

interface PopularProduct {
  productId: string;
  name: string;
  sku: string;
  quantitySold: number;
}

interface ClearanceSummary {
  activeCount: number;
  totalPotentialSavings: number;
}

interface TradeApplicationFunnel {
  pending: number;
  approved: number;
  rejected: number;
  approvalRate: number | null;
}

interface BundleCatalogSummary {
  totalBundles: number;
  bySector: Record<string, number>;
}

interface LowStockProduct {
  id: string;
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const percent = new Intl.NumberFormat('en-ZA', { style: 'percent', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short' });

// "Business Health" section added to surface Clearance, trade
// application, and bundle data that already existed in their own admin
// screens but was never brought together anywhere an admin reviewing
// overall business health would look (a real gap found directly in Gap
// Analysis V). Bundle catalog is deliberately a COUNT, not a
// "performance" metric — see BundleCatalogSummary's own comment on the
// backend for why: there's no bundle-price checkout mechanism anywhere
// in this codebase, so there's no real sales data behind bundles to
// report on.
export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const [summary, revenueOverTime, popularProducts, clearance, tradeApplications, bundleCatalog, lowStock] =
    await Promise.all([
      apiClient.get<AnalyticsSummary>('/v1/analytics/summary', { accessToken: session.accessToken }),
      apiClient.get<RevenueBucket[]>('/v1/analytics/revenue-over-time?days=30', {
        accessToken: session.accessToken,
      }),
      apiClient.get<PopularProduct[]>('/v1/analytics/popular-products?limit=10', {
        accessToken: session.accessToken,
      }),
      apiClient.get<ClearanceSummary>('/v1/analytics/clearance-summary', { accessToken: session.accessToken }),
      apiClient.get<TradeApplicationFunnel>('/v1/analytics/trade-application-funnel', {
        accessToken: session.accessToken,
      }),
      apiClient.get<BundleCatalogSummary>('/v1/analytics/bundle-catalog-summary', {
        accessToken: session.accessToken,
      }),
      // Reuses the same admin-gated endpoint /admin/low-stock itself
      // calls, rather than a separate analytics-side summary method —
      // this section only needs the count, and there's no reason to
      // duplicate the real detection logic (ProductsService.findLowStock)
      // a second time just to get a number.
      apiClient.get<LowStockProduct[]>('/v1/products/low-stock', { accessToken: session.accessToken }),
    ]);

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-6">Analytics</h1>

      <div className="grid grid-cols-3 gap-1 bg-black/10 border border-black/10 mb-10">
        <StatBox value={zar.format(summary.totalRevenue)} label="Total Revenue" />
        <StatBox value={String(summary.totalOrders)} label="Total Orders" />
        <StatBox value={zar.format(summary.averageOrderValue)} label="Avg. Order Value" />
      </div>

      <div className="grid grid-cols-2 gap-10 mb-10">
        <div>
          <h2 className="text-base font-semibold mb-4">Orders by Status</h2>
          <ul>
            {Object.entries(summary.ordersByStatus).map(([status, count]) => (
              <li key={status} className="flex justify-between text-sm py-2 border-b border-black/5">
                <span className="font-mono text-[12px] text-steel">{status}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-base font-semibold mb-4 mt-8">Popular Products</h2>
          {popularProducts.length === 0 ? (
            <p className="text-sm text-steel">No orders yet.</p>
          ) : (
            <ul>
              {popularProducts.map((product, i) => (
                <li key={product.productId} className="flex justify-between text-sm py-2 border-b border-black/5">
                  <span>
                    <span className="font-mono text-[11px] text-steel mr-2">{i + 1}</span>
                    {product.name}
                  </span>
                  <span className="font-mono text-[12px]">{product.quantitySold} sold</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-base font-semibold mb-4">Revenue — Last 30 Days</h2>
          {revenueOverTime.length === 0 ? (
            <p className="text-sm text-steel">No revenue in this period yet.</p>
          ) : (
            <ul>
              {revenueOverTime.map((bucket) => (
                <li key={bucket.day} className="flex justify-between text-sm py-1.5 border-b border-black/5">
                  <span className="text-[#4A5157]">{dateFormatter.format(new Date(bucket.day))}</span>
                  <span className="text-steel">{bucket.orderCount} orders</span>
                  <span className="font-mono">{zar.format(bucket.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <h2 className="text-base font-semibold mb-4">Business Health</h2>
      <div className="grid grid-cols-4 gap-5">
        <div className="border border-black/10 rounded-sm p-4">
          <div className="font-mono text-[10px] uppercase tracking-wide text-steel mb-2">Clearance</div>
          <div className="text-2xl font-display font-bold mb-1">{clearance.activeCount}</div>
          <p className="text-[12.5px] text-steel mb-3">
            item{clearance.activeCount === 1 ? '' : 's'} active — {zar.format(clearance.totalPotentialSavings)} in
            live discount value
          </p>
          <Link href="/admin/clearance" className="font-mono text-[11px] text-hydra">
            Manage Clearance →
          </Link>
        </div>

        <div className="border border-black/10 rounded-sm p-4">
          <div className="font-mono text-[10px] uppercase tracking-wide text-steel mb-2">Trade Applications</div>
          <div className="text-2xl font-display font-bold mb-1">{tradeApplications.pending}</div>
          <p className="text-[12.5px] text-steel mb-3">
            pending review · {tradeApplications.approved} approved, {tradeApplications.rejected} rejected
            {tradeApplications.approvalRate !== null && (
              <> · {percent.format(tradeApplications.approvalRate)} approval rate</>
            )}
          </p>
          <Link href="/admin/trade-applications" className="font-mono text-[11px] text-hydra">
            Review Applications →
          </Link>
        </div>

        <div className="border border-black/10 rounded-sm p-4">
          <div className="font-mono text-[10px] uppercase tracking-wide text-steel mb-2">Bundle Catalog</div>
          <div className="text-2xl font-display font-bold mb-1">{bundleCatalog.totalBundles}</div>
          <p className="text-[12.5px] text-steel mb-3">
            {Object.entries(bundleCatalog.bySector)
              .map(([sector, count]) => `${count} ${sector}`)
              .join(', ') || 'No bundles defined yet'}
          </p>
          <Link href="/admin/bundles" className="font-mono text-[11px] text-hydra">
            Manage Bundles →
          </Link>
        </div>

        <div className="border border-black/10 rounded-sm p-4">
          <div className="font-mono text-[10px] uppercase tracking-wide text-steel mb-2">Low Stock</div>
          <div className="text-2xl font-display font-bold mb-1">{lowStock.length}</div>
          <p className="text-[12.5px] text-steel mb-3">
            product{lowStock.length === 1 ? '' : 's'} at risk of running out soon, by real sales velocity
          </p>
          <Link href="/admin/low-stock" className="font-mono text-[11px] text-hydra">
            View Low Stock →
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white p-5">
      <div className="font-display text-2xl font-bold text-hydra">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-steel mt-1">{label}</div>
    </div>
  );
}
