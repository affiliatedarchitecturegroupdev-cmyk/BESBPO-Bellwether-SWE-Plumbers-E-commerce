'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { addToCartAction } from '@/lib/actions/cart-actions';
import { Button } from '../ui/Button';

interface AddToCartButtonProps {
  productId: string;
  quantity?: number;
  className?: string;
}

type Status = 'idle' | 'added' | 'error';

export function AddToCartButton({ productId, quantity = 1, className = '' }: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>('idle');
  const router = useRouter();
  const pathname = usePathname();

  function handleClick() {
    startTransition(async () => {
      const result = await addToCartAction(productId, quantity);

      if (!result.ok && result.error === 'sign-in-required') {
        router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`);
        return;
      }

      setStatus(result.ok ? 'added' : 'error');
      if (result.ok) {
        setTimeout(() => setStatus('idle'), 2000);
      }
    });
  }

  const label = isPending ? 'Adding…' : status === 'added' ? 'Added ✓' : status === 'error' ? 'Try again' : 'Add to Cart';

  return (
    <Button variant="primary" onClick={handleClick} disabled={isPending} className={`w-full justify-center ${className}`}>
      {label}
    </Button>
  );
}
