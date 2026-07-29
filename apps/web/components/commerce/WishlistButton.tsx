'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleWishlistAction } from '@/lib/actions/wishlist-actions';

interface Props {
  productId: string;
  initiallyWishlisted: boolean;
  className?: string;
}

// A real optimistic-update trap avoided deliberately: this does NOT flip
// local state immediately on click and hope the request succeeds — if
// the request fails (not signed in, network error), an optimistic flip
// would show the wrong state until the next full page load. Instead it
// waits for the actual result and only then updates, with router.refresh()
// keeping every other WishlistButton instance on the page (a product can
// appear in more than one place) in sync too.
export function WishlistButton({ productId, initiallyWishlisted, className }: Props) {
  const [isWishlisted, setIsWishlisted] = useState(initiallyWishlisted);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await toggleWishlistAction(productId, isWishlisted);
      if (!result.ok) {
        setError(result.error ?? 'Could not update your wishlist');
        return;
      }
      setIsWishlisted((prev) => !prev);
      router.refresh();
    });
  }

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={isPending}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        aria-pressed={isWishlisted}
        className={`text-lg leading-none disabled:opacity-50 ${isWishlisted ? 'text-red-600' : 'text-steel hover:text-red-600'}`}
      >
        {isWishlisted ? '♥' : '♡'}
      </button>
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
