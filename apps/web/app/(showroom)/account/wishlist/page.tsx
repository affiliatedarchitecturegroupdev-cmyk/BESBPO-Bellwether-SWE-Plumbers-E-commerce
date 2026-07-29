import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { getCurrentAccount } from '@/lib/get-current-account';
import { ProductCard } from '@/components/commerce/ProductCard';
import { WishlistButton } from '@/components/commerce/WishlistButton';
import { Product } from '@/lib/types';

interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
}

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="text-sm text-steel">Please sign in.</p>;
  }

  const [wishlist, account] = await Promise.all([
    apiClient.get<WishlistItem[]>('/v1/wishlist', { accessToken: session.accessToken }),
    getCurrentAccount(),
  ]);

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Wishlist</h1>
      <p className="text-sm text-steel mb-8">Saved for later — nothing here affects your cart until you add it.</p>

      {wishlist.length === 0 ? (
        <p className="text-sm text-steel">
          Nothing saved yet — look for the heart icon on any product page.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-5">
          {wishlist.map((item) => (
            <div key={item.id} className="relative">
              <div className="absolute top-2 right-2 z-10 bg-white/90 rounded-full w-8 h-8 flex items-center justify-center">
                <WishlistButton productId={item.productId} initiallyWishlisted={true} />
              </div>
              <ProductCard product={item.product} isTradeAccount={account?.type === 'TRADE'} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
