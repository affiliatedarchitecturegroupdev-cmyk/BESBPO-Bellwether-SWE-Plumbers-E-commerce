'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bulkAddToCartAction } from '@/lib/actions/cart-actions';

interface Props {
  items: { productId: string; quantity: number }[];
}

export function AddBundleToCartButton({ items }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await bulkAddToCartAction(items);
      if (result.ok) {
        router.push('/cart');
      }
      // A failure here is almost always "please sign in" — bulkAddToCartAction's
      // own error message covers that; no separate error UI needed for
      // this simple, single-button page.
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="w-full bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-5 py-3.5 rounded-sm disabled:opacity-60"
    >
      {isPending ? 'Adding…' : 'Add All Items to Cart'}
    </button>
  );
}
