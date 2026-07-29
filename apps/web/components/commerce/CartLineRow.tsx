'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CartLine } from '@/lib/types';
import { removeCartItemAction, updateCartItemAction } from '@/lib/actions/cart-actions';

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

interface Props {
  line: CartLine;
}

export function CartLineRow({ line }: Props) {
  const [quantity, setQuantity] = useState(line.quantity);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeQuantity(next: number) {
    if (next < 1) return;
    setQuantity(next); // optimistic — reverted below if the server action fails
    startTransition(async () => {
      const result = await updateCartItemAction(line.cartItemId, next);
      if (!result.ok) {
        setQuantity(line.quantity); // revert to the last known-good server value
        setError('Could not update quantity');
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeCartItemAction(line.cartItemId);
      if (!result.ok) setError('Could not remove item');
    });
  }

  return (
    <div className="grid grid-cols-[80px_1fr_auto_auto_auto] gap-4 items-center py-5 border-b border-black/10">
      <div className="w-20 h-20 bg-[#F3F4F5] border border-black/10 relative overflow-hidden">
        {line.imageUrl && <Image src={line.imageUrl} alt={line.name} fill className="object-cover" />}
      </div>

      <div>
        <Link href={`/product/${line.productSlug}`} className="text-sm font-semibold hover:text-hydra">
          {line.name}
        </Link>
        {line.appliedTierDiscount !== null && (
          <p className="text-[11px] text-hydra mt-0.5">
            Bulk pricing: {line.appliedTierDiscount}% off ({zar.format(line.baseUnitPrice)} → {zar.format(line.unitPrice)}
            /unit)
          </p>
        )}
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      </div>

      <div className="flex items-center border border-black/15">
        <button
          onClick={() => changeQuantity(quantity - 1)}
          disabled={isPending || quantity <= 1}
          className="w-8 h-9 text-base disabled:opacity-30"
        >
          −
        </button>
        <span className="w-10 text-center font-mono text-sm">{quantity}</span>
        <button
          onClick={() => changeQuantity(quantity + 1)}
          disabled={isPending}
          className="w-8 h-9 text-base"
        >
          +
        </button>
      </div>

      <span className="font-mono text-sm font-semibold">{zar.format(line.unitPrice * quantity)}</span>

      <button
        onClick={handleRemove}
        disabled={isPending}
        className="font-mono text-[11px] text-steel hover:text-red-600"
      >
        Remove
      </button>
    </div>
  );
}
