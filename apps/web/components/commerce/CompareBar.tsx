'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCompareList } from '@/lib/compare-list';

// Shown across the whole site (rendered from the root layout) but only
// ever visible when the compare list actually has something in it — an
// empty state here would just be visual noise on every single page for
// a feature most visits won't use.
export function CompareBar() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getCompareList().length);
    function handleChange() {
      setCount(getCompareList().length);
    }
    window.addEventListener('compare-list-changed', handleChange);
    return () => window.removeEventListener('compare-list-changed', handleChange);
  }, []);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-ink text-white rounded-sm shadow-lg px-5 py-3 flex items-center gap-4">
      <span className="text-[13px]">
        {count} product{count === 1 ? '' : 's'} to compare
      </span>
      <Link href="/compare" className="font-mono text-[11px] uppercase tracking-wide text-cyan">
        Compare Now →
      </Link>
    </div>
  );
}
