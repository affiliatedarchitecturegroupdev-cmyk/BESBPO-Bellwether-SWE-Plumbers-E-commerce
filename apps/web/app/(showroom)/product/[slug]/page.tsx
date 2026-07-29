import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { apiClient, ApiError } from '@/lib/api-client';
import { getCurrentAccount } from '@/lib/get-current-account';
import { PriceTag } from '@/components/commerce/PriceTag';
import { AddToCartButton } from '@/components/commerce/AddToCartButton';
import { NotifyBackInStockButton } from '@/components/commerce/NotifyBackInStockButton';
import { ProductGallery } from '@/components/commerce/ProductGallery';
import { ReviewsSection } from '@/components/commerce/ReviewsSection';
import { QuestionsSection } from '@/components/commerce/QuestionsSection';
import { FrequentlyBoughtWith } from '@/components/commerce/FrequentlyBoughtWith';
import { VariantSelector } from '@/components/commerce/VariantSelector';
import { WishlistButton } from '@/components/commerce/WishlistButton';
import { RecentlyViewedTracker } from '@/components/commerce/RecentlyViewedTracker';
import { auth } from '@/auth';
import { Product } from '@/lib/types';

interface Props {
  params: { slug: string };
}

// Reuses the exact same fetchProduct helper the page component itself
// calls below — Next.js memoizes identical fetch calls within a single
// request, so this doesn't double the real network cost, and it's the
// standard shape for generateMetadata + a page component both needing
// the same resource. Was missing entirely before this — every product
// page previously showed the same site-wide title/description from the
// root layout, regardless of which of the 8,491 products was open.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await fetchProduct(params.slug);
  if (!product) return {};

  const description = product.description
    ? product.description.slice(0, 155)
    : `${product.name} — available from Bellwether SWE Plumbers.`;

  return {
    title: `${product.name} | Bellwether SWE Plumbers`,
    description,
    openGraph: {
      title: product.name,
      description,
      type: 'website',
    },
  };
}

// The second reference pattern (alongside the home page): fetching a single
// resource by slug, and the notFound() convention for a 404 API response —
// every other detail page (bundle/[slug], category/[slug]) should follow
// this same shape rather than inventing its own error handling.
export default async function ProductPage({ params }: Props) {
  const [product, account] = await Promise.all([fetchProduct(params.slug), getCurrentAccount()]);

  if (!product) notFound();

  const [variants, isWishlisted, priceTiers] = await Promise.all([
    fetchVariantSiblings(params.slug),
    isProductWishlisted(product.id),
    apiClient.get<{ minQuantity: number; discountPercent: string }[]>(`/v1/price-tiers?productId=${product.id}`),
  ]);
  const isTradeAccount = account?.type === 'TRADE';

  // Schema.org Product markup — core fields only. aggregateRating is
  // deliberately omitted: ReviewsSection fetches review data
  // independently as its own server component, so the average
  // rating/count isn't available up here without restructuring how this
  // page fetches data. Worth adding later, not faked with a placeholder
  // value now.
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    sku: product.sku,
    image: product.images[0]?.url,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ZAR',
      price: isTradeAccount ? product.tradePrice : product.retailPrice,
      availability:
        product.stockQty > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="max-w-[1240px] mx-auto px-8 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <RecentlyViewedTracker slug={product.slug} />
      <div className="grid grid-cols-2 gap-14">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          <span className="font-mono text-[11px] uppercase tracking-wide text-hydra">
            {product.category.name}
          </span>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-[26px] font-bold mt-2 mb-2">{product.name}</h1>
            <WishlistButton productId={product.id} initiallyWishlisted={isWishlisted} className="mt-3" />
          </div>
          <p className="font-mono text-[11.5px] text-steel mb-5">
            SKU: {product.sku}
            {product.sansCompliant && ' · SANS-compliant'}
          </p>

          <div className="border-y border-black/10 py-5 mb-6">
            <PriceTag
              retailPrice={product.retailPrice}
              tradePrice={product.tradePrice}
              isTradeAccount={isTradeAccount}
            />
            {priceTiers.length > 0 && (
              <ul className="mt-3 space-y-0.5">
                {priceTiers.map((tier) => (
                  <li key={tier.minQuantity} className="text-[12.5px] text-hydra">
                    Buy {tier.minQuantity}+, save {Number(tier.discountPercent)}%
                  </li>
                ))}
              </ul>
            )}
          </div>

          {variants.group && (
            <VariantSelector
              optionLabel={variants.group.optionLabel}
              currentSlug={params.slug}
              siblings={variants.siblings}
            />
          )}

          <StockBadge quantity={product.stockQty} />

          {/* Quantity stepper isn't built yet — this adds 1 at a time.
              AddToCartButton itself is fully functional (see
              components/commerce/AddToCartButton.tsx); the qty input in front
              of it is the remaining gap, not the cart action itself. */}
          <div className="mt-5 max-w-[220px]">
            <AddToCartButton productId={product.id} />
          </div>

          {product.stockQty <= 0 && <NotifyBackInStockButton productId={product.id} />}

          {product.description && <p className="text-sm text-[#4A5157] mt-6">{product.description}</p>}
        </div>
      </div>

      <FrequentlyBoughtWith productId={product.id} />
      <ReviewsSection productId={product.id} productSlug={product.slug} isSignedIn={account !== null} />
      <QuestionsSection productId={product.id} productSlug={product.slug} isSignedIn={account !== null} />
    </div>
  );
}

async function fetchProduct(slug: string): Promise<Product | null> {
  try {
    return await apiClient.get<Product>(`/v1/products/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

interface VariantSiblingsResult {
  group: { optionLabel: string } | null;
  siblings: { slug: string; variantValue: string; stockQty: number }[];
}

async function fetchVariantSiblings(slug: string): Promise<VariantSiblingsResult> {
  try {
    return await apiClient.get<VariantSiblingsResult>(`/v1/products/${slug}/variants`);
  } catch {
    // Not worth failing the whole page over — a product simply renders
    // without a variant selector if this lookup has any trouble.
    return { group: null, siblings: [] };
  }
}

// Fetches the whole wishlist and checks membership rather than a
// dedicated "is this one product wishlisted" endpoint — acceptable for
// a realistically-sized wishlist, and not worth the extra API surface
// for what's currently only needed on this one page. Returns false for
// a signed-out visitor without attempting the call at all — an
// unauthenticated /v1/wishlist request would just fail anyway.
async function isProductWishlisted(productId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.accessToken) return false;

  try {
    const wishlist = await apiClient.get<{ productId: string }[]>('/v1/wishlist', {
      accessToken: session.accessToken,
    });
    return wishlist.some((item) => item.productId === productId);
  } catch {
    return false;
  }
}

function StockBadge({ quantity }: { quantity: number }) {
  const inStock = quantity > 0;
  return (
    <div className={`flex items-center gap-2 text-[12.5px] ${inStock ? 'text-[#1E8E5A]' : 'text-steel'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${inStock ? 'bg-[#1E8E5A]' : 'bg-steel'}`} />
      {inStock ? 'In stock — dispatched within 1–2 working days' : 'Out of stock'}
    </div>
  );
}
