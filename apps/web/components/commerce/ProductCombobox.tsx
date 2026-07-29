'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Paginated, Product } from '@/lib/types';

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  tradePrice: string;
}

interface ProductComboboxProps {
  onSelect: (product: ProductOption) => void;
  placeholder?: string;
  // Hide already-picked products from further results — a form building
  // up a multi-row selection (bundles, bulk orders, recurring order
  // templates) shouldn't let the same product be searched up and added
  // twice from this component alone (the caller may still have its own
  // separate reasons to allow or reject a duplicate; this is just about
  // not showing an already-selected item as a search result).
  excludeIds?: string[];
}

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

// The fix for a real, live bug: five separate pages (guest checkout,
// trade bulk-order, trade quote requests, recurring orders, admin bundle
// creation) each pre-fetched up to pageSize=200 products server-side to
// populate a static <select> dropdown — but the public products
// endpoint caps pageSize at 100, so all five requests were failing
// outright, and even a successfully-loaded 100-item unsorted dropdown
// would be unusable at an 8,491-product catalog anyway. This replaces
// every one of those with real, on-demand, debounced search — the same
// GET /v1/products?search= the search page already relies on, called
// directly from the browser since it's a public, unauthenticated
// endpoint (see api-client.ts's NEXT_PUBLIC_API_URL — safe to call
// client-side).
export function ProductCombobox({ onSelect, placeholder, excludeIds = [] }: ProductComboboxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      apiClient
        .get<Paginated<Product>>(`/v1/products?search=${encodeURIComponent(query.trim())}&pageSize=10`)
        .then((result) => {
          setResults(
            result.items
              .filter((p) => !excludeIds.includes(p.id))
              .map((p) => ({ id: p.id, name: p.name, sku: p.sku, tradePrice: p.tradePrice })),
          );
          setIsOpen(true);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => setIsLoading(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // excludeIds intentionally omitted — re-filtering the already-fetched
    // results happens inline below instead of re-triggering a network
    // request every time the caller's selection list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(product: ProductOption) {
    onSelect(product);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  }

  const visibleResults = results.filter((p) => !excludeIds.includes(p.id));

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => visibleResults.length > 0 && setIsOpen(true)}
        placeholder={placeholder ?? 'Search products by name or SKU…'}
        className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
      />
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-black/15 rounded-sm shadow-lg">
          {isLoading && <div className="px-3 py-2 text-[12.5px] text-steel">Searching…</div>}
          {!isLoading && visibleResults.length === 0 && (
            <div className="px-3 py-2 text-[12.5px] text-steel">No matching products</div>
          )}
          {!isLoading &&
            visibleResults.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 border-b border-black/5 last:border-b-0"
              >
                {product.name} <span className="font-mono text-[11px] text-steel">({product.sku})</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
