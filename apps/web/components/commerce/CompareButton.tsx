'use client';

import { useEffect, useState } from 'react';
import { isInCompareList, toggleCompare } from '@/lib/compare-list';

// Takes the product's SLUG, not its ID — see compare-list.ts's own
// comment for why (no by-ID product endpoint exists to fetch it back
// with later, only by-slug).
export function CompareButton({ slug }: { slug: string }) {
  const [isSelected, setIsSelected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reads the actual localStorage state on mount (client-side only —
  // this must NOT try to read localStorage during server rendering,
  // hence the effect rather than useState's initializer) and again
  // whenever any CompareButton/CompareBar in this tab changes the list,
  // via the same custom event compare-list.ts dispatches instead of the
  // native 'storage' event (which only fires cross-tab).
  useEffect(() => {
    setIsSelected(isInCompareList(slug));
    function handleChange() {
      setIsSelected(isInCompareList(slug));
    }
    window.addEventListener('compare-list-changed', handleChange);
    return () => window.removeEventListener('compare-list-changed', handleChange);
  }, [slug]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    const result = toggleCompare(slug);
    if (!result.ok) {
      setError(result.reason ?? 'Could not add to comparison');
    }
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={handleClick}
        className={`font-mono text-[10.5px] uppercase tracking-wide ${isSelected ? 'text-hydra' : 'text-steel'}`}
      >
        {isSelected ? '✓ Comparing' : '+ Compare'}
      </button>
      {error && <p className="text-[10.5px] text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}
