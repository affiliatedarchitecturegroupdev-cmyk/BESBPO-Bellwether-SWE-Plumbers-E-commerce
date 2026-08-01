'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Product } from '@/lib/types';

interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  addedAt?: string;
}

interface WishlistClientProps {
  items: WishlistItem[];
  accessToken: string;
}

export function WishlistClient({ items: initialItems, accessToken }: WishlistClientProps) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const router = useRouter();

  function generateShareCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  async function handleShare() {
    const shareCode = generateShareCode();
    const shareUrl = `${window.location.origin}/wishlist/shared/${shareCode}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      prompt('Copy this link to share your wishlist:', shareUrl);
    }
  }

  async function handleAddAllToCart() {
    if (items.length === 0) return;

    startTransition(async () => {
      setError(null);
      let addedCount = 0;
      let failedCount = 0;

      for (const item of items) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/cart/lines`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ productId: item.productId, quantity: 1 }),
          });
          if (res.ok) addedCount++;
          else failedCount++;
        } catch {
          failedCount++;
        }
      }

      if (addedCount > 0) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          router.push('/cart');
        }, 1500);
      }
      if (failedCount > 0) {
        setError(`${failedCount} item(s) could not be added to cart.`);
      }
    });
  }

  async function handleRemove(productId: string) {
    setRemovingId(productId);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/wishlist/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setItems((prev) => prev.filter((item) => item.productId !== productId));
    } catch {
      setError('Failed to remove item from wishlist.');
    } finally {
      setRemovingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-black/15 rounded-sm">
        <svg className="w-16 h-16 text-steel mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <p className="text-steel text-lg mb-2">Your wishlist is empty</p>
        <p className="text-steel text-sm mb-6">Save items for later by clicking the heart icon on any product.</p>
        <Link href="/search" className="text-hydra hover:underline">
          Browse products →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/5 rounded-sm p-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wide text-steel">
            {items.length} item{items.length !== 1 ? 's' : ''} in wishlist
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 border border-black/15 rounded-sm text-sm hover:bg-black/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {showCopied ? 'Link Copied!' : 'Share Wishlist'}
          </button>

          {/* Add All to Cart Button */}
          <button
            onClick={handleAddAllToCart}
            disabled={isPending}
            className="flex items-center gap-2 bg-hydra text-white px-4 py-2 rounded-sm text-sm hover:bg-hydra/90 transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Adding...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Add All to Cart
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-sm p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-700 text-sm">All items added to cart! Redirecting...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-sm p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Wishlist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => {
          const product = item.product;
          const inStock = product.stockQty > 0;

          return (
            <div
              key={item.id}
              className="bg-white border border-black/10 rounded-sm overflow-hidden group hover:border-hydra/30 transition-colors"
            >
              {/* Product Image */}
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

                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(item.productId)}
                  disabled={removingId === item.productId}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
                  title="Remove from wishlist"
                >
                  {removingId === item.productId ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>

                {/* Stock Badge */}
                {!inStock && (
                  <div className="absolute bottom-2 left-2 bg-red-500 text-white text-[10px] font-mono uppercase px-2 py-1 rounded-sm">
                    Out of Stock
                  </div>
                )}
              </div>

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
                  {product.tradePrice && (
                    <span className="font-mono text-[10px] text-green-600">Trade available</span>
                  )}
                </div>

                {/* Add to Cart */}
                <button
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/cart/lines`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${accessToken}`,
                          },
                          body: JSON.stringify({ productId: item.productId, quantity: 1 }),
                        });
                        handleRemove(item.productId);
                      } catch {
                        setError('Failed to add item to cart.');
                      }
                    });
                  }}
                  disabled={!inStock || isPending}
                  className="w-full bg-black text-white font-mono text-[10px] uppercase tracking-wide py-2 rounded-sm hover:bg-hydra transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inStock ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
