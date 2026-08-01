import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Shared Wishlist | Bellwether SWE Plumbers',
  description: 'View a shared wishlist from Bellwether SWE Plumbers.',
};

interface SharedWishlistItem {
  id: string;
  productId: string;
  product: SharedProduct;
  addedAt: string;
}

interface SharedProduct {
  id: string;
  slug: string;
  name: string;
  sku: string;
  retailPrice: string;
  tradePrice?: string;
  stockQty: number;
  images: { id: string; url: string; sortOrder: number }[];
}

// Mock data for demo - in production this would fetch from API using the share code
const mockProducts: SharedProduct[] = [
  {
    id: '1',
    slug: 'grohe-baix-singles-lever-mixer-tap',
    name: 'Grohe Baix Single Lever Mixer Tap',
    sku: 'GRO-32167AL0',
    retailPrice: '2849.00',
    stockQty: 15,
    images: [{ id: '1', url: 'https://picsum.photos/seed/grohe/400/400', sortOrder: 1 }],
  },
  {
    id: '2',
    slug: 'bosch-gsb-180-li-cordless-drill',
    name: 'Bosch GSB 180-LI Cordless Drill',
    sku: 'BOS-06019F8100',
    retailPrice: '3299.00',
    stockQty: 8,
    images: [{ id: '2', url: 'https://picsum.photos/seed/bosch/400/400', sortOrder: 1 }],
  },
  {
    id: '3',
    slug: 'venus-hot-water-cylinder-200l',
    name: 'Venus Hot Water Cylinder 200L',
    sku: 'VEN-HWC200',
    retailPrice: '8999.00',
    stockQty: 3,
    images: [{ id: '3', url: 'https://picsum.photos/seed/venus/400/400', sortOrder: 1 }],
  },
];

export default async function SharedWishlistPage({ params }: { params: { code: string } }) {
  // In production, fetch shared wishlist using the code
  const wishlistItems: SharedWishlistItem[] = mockProducts.map((product, index) => ({
    id: `item-${index}`,
    productId: product.id,
    product,
    addedAt: new Date(Date.now() - index * 86400000).toISOString(),
  }));

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-steel text-sm mb-2">
          <Link href="/account/wishlist" className="hover:text-hydra">
            Wishlist
          </Link>
          <span>/</span>
          <span>Shared</span>
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Shared Wishlist</h1>
        <p className="text-steel">
          This wishlist was shared with you. Sign in to add items to your own wishlist or cart.
        </p>
      </div>

      {/* CTA Banner */}
      <div className="bg-hydra/5 border border-hydra/20 rounded-sm p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold mb-1">Want to save these items for later?</p>
            <p className="text-sm text-steel">Sign in to create your own wishlist and get price drop alerts.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/signin"
              className="bg-hydra text-white px-6 py-2 rounded-sm text-sm hover:bg-hydra/90 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="border border-black/15 px-6 py-2 rounded-sm text-sm hover:bg-black/5 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>

      {/* Wishlist Items */}
      <div className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-steel mb-4">
          {wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''} in this wishlist
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlistItems.map((item) => {
            const product = item.product;
            const inStock = product.stockQty > 0;

            return (
              <div
                key={item.id}
                className="bg-white border border-black/10 rounded-sm overflow-hidden hover:border-hydra/30 transition-colors"
              >
                {/* Product Image */}
                <Link href={`/product/${product.slug}`} className="block">
                  <div className="relative aspect-square bg-black/5">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-steel text-sm">
                        No image
                      </div>
                    )}

                    {/* Stock Badge */}
                    {!inStock && (
                      <div className="absolute bottom-2 left-2 bg-red-500 text-white text-[10px] font-mono uppercase px-2 py-1 rounded-sm">
                        Out of Stock
                      </div>
                    )}
                  </div>
                </Link>

                {/* Product Info */}
                <div className="p-3">
                  <Link href={`/product/${product.slug}`} className="hover:text-hydra">
                    <p className="font-medium text-sm line-clamp-2 mb-1">{product.name}</p>
                  </Link>
                  <p className="font-mono text-[10px] text-steel mb-2">{product.sku}</p>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="font-mono text-sm font-semibold">
                      R{Number(product.retailPrice).toFixed(2)}
                    </span>
                  </div>

                  {/* View Product */}
                  <Link
                    href={`/product/${product.slug}`}
                    className="block w-full text-center bg-black text-white font-mono text-[10px] uppercase tracking-wide py-2 rounded-sm hover:bg-hydra transition-colors"
                  >
                    View Product
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mt-12 text-center border-t border-black/10 pt-8">
        <p className="text-steel text-sm mb-4">
          Looking for plumbing supplies for your next project?
        </p>
        <Link href="/search" className="text-hydra hover:underline">
          Browse our full catalog →
        </Link>
      </div>
    </div>
  );
}
