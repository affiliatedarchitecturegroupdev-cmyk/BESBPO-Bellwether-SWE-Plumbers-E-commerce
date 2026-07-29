'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setCouponActiveAction } from '@/lib/actions/admin-coupons';

interface Props {
  id: string;
  active: boolean;
}

export function CouponActiveToggle({ id, active }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      await setCouponActiveAction(id, !active);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`font-mono text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-sm disabled:opacity-60 ${
        active ? 'bg-[#EAF3F8] text-hydra' : 'bg-black/5 text-steel'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </button>
  );
}
