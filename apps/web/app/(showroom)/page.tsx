import { apiClient } from '@/lib/api-client';
import { getCurrentAccount } from '@/lib/get-current-account';
import { ProductCard } from '@/components/commerce/ProductCard';
import { ProductRailSection } from '@/components/commerce/ProductRailSection';
import { ButtonLink } from '@/components/ui/Button';
import { TrustBar } from '@/components/home/TrustBar';
import { BrandStrip } from '@/components/home/BrandStrip';
import { BundlesSection } from '@/components/home/BundlesSection';
import { RecentlyViewedSection } from '@/components/home/RecentlyViewedSection';
import { TradeAccountCta } from '@/components/home/TradeAccountCta';
import { NewsletterBanner } from '@/components/home/NewsletterBanner';
import { Paginated, Product } from '@/lib/types';

interface CategoryNode {
  slug: string;
  name: string;
  children: CategoryNode[];
}

interface BundleSummary {
  slug: string;
  name: string;
  sector: string;
  bundlePrice: string;
  description: string | null;
}

// Server component with mobile-first responsive design
export default async function HomePage() {
  const [popular, categories, newArrivals, trending, onSale, bundles, topRated, brands, account] =
    await Promise.all([
      apiClient.get<Product[]>('/v1/products/popular?limit=8'),
      apiClient.get<CategoryNode[]>('/v1/categories'),
      apiClient.get<Paginated<Product>>('/v1/products?sortBy=newest&pageSize=4'),
      apiClient.get<Paginated<Product>>('/v1/products/trending?page=1&pageSize=8'),
      apiClient.get<Paginated<Product>>('/v1/products/on-sale?page=1&pageSize=8'),
      apiClient.get<Paginated<BundleSummary>>('/v1/bundles?pageSize=3'),
      apiClient.get<Product[]>('/v1/products/top-rated?limit=8'),
      apiClient.get<string[]>('/v1/products/brands'),
      getCurrentAccount(),
    ]);
  const isTradeAccount = account?.type === 'TRADE';

  return (
    <>
      {/* Hero Section - Mobile Responsive */}
      <section className="bg-ink text-porcelain">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <p className="font-mono text-[10px] sm:text-[11px] tracking-wide text-cyan uppercase mb-3 sm:mb-3.5">
            10,500+ SKUs · Trade & Retail
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl max-w-xl mb-4 leading-tight">
            Everything for the job, in stock.
          </h1>
          <p className="text-porcelain-dim max-w-md mb-6 sm:mb-8 text-sm sm:text-base">
            Pipes, fittings, valves, pumps, and pre-packaged project bundles — with trade pricing for
            registered accounts.
          </p>
          <ButtonLink href="#popular" variant="primary" className="text-sm sm:text-base">
            Shop Popular Products
          </ButtonLink>
        </div>
      </section>

      <TrustBar />

      {/* Categories - Mobile Responsive Grid */}
      {categories.length > 0 && (
        <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16 border-b border-black/10">
          <h2 className="text-xl sm:text-2xl font-display font-bold mb-5 sm:mb-7">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {categories.map((category) => (
              <a
                key={category.slug}
                href={`/category/${category.slug}`}
                className="border border-black/10 rounded-sm px-4 sm:px-5 py-4 sm:py-6 text-xs sm:text-sm font-semibold hover:border-hydra hover:text-hydra transition-colors text-center"
              >
                {category.name}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Popular Products - Mobile Responsive Grid */}
      <section id="popular" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-2 mb-5 sm:mb-7">
          <h2 className="text-xl sm:text-2xl font-display font-bold">Popular Products</h2>
          <ButtonLink href="/search" variant="ghost" className="!text-ink !border-black/15 text-sm">
            Browse all →
          </ButtonLink>
        </div>

        {popular.length === 0 ? (
          <EmptyProductState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {popular.map((product) => (
              <ProductCard key={product.id} product={product} isTradeAccount={isTradeAccount} />
            ))}
          </div>
        )}
      </section>

      <ProductRailSection
        title="New Arrivals"
        seeAllHref="/search?sortBy=newest"
        products={newArrivals.items}
        isTradeAccount={isTradeAccount}
      />

      <ProductRailSection
        title="Trending This Week"
        subtitle="Real short-term order velocity, not all-time volume"
        seeAllHref="/trending"
        products={trending.items}
        isTradeAccount={isTradeAccount}
      />

      <ProductRailSection
        title="Clearance"
        subtitle="Genuine overstock, reviewed and confirmed — not arbitrary discounting"
        seeAllHref="/clearance"
        products={onSale.items}
        isTradeAccount={isTradeAccount}
      />

      <BundlesSection bundles={bundles.items} />

      <ProductRailSection
        title="Top Rated"
        subtitle="Ranked by real customer ratings, with a minimum number of reviews"
        seeAllHref="/search"
        products={topRated}
        isTradeAccount={isTradeAccount}
      />

      <BrandStrip brands={brands} />

      <RecentlyViewedSection />

      <TradeAccountCta />

      <NewsletterBanner />
    </>
  );
}

function EmptyProductState() {
  return (
    <div className="border border-dashed border-black/15 rounded-sm py-12 sm:py-20 text-center text-steel">
      <p className="text-xs sm:text-sm">No products in the catalog yet.</p>
    </div>
  );
}
