import { Metadata } from 'next';
import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { WishlistClient } from './WishlistClient';
import { Product } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Wishlist | Bellwether SWE Plumbers',
  description: 'View and manage your saved products. Share your wishlist or add items to cart.',
};

interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  addedAt?: string;
}

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return (
      <div className="text-center py-12">
        <p className="text-steel text-sm">Please sign in to view your wishlist.</p>
      </div>
    );
  }

  const wishlist = await apiClient.get<WishlistItem[]>('/v1/wishlist', {
    accessToken: session.accessToken,
  });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Wishlist</h1>
      <p className="text-sm text-steel mb-8">
        Saved for later — share your wishlist or add items to cart.
      </p>

      <WishlistClient items={wishlist} accessToken={session.accessToken} />
    </div>
  );
}
