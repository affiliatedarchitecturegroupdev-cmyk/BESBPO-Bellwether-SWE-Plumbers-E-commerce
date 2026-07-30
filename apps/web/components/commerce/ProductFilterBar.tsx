'use client';

import { useRef, useState } from 'react';

type SortOrder = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

interface Props {
  action: string; // the page path this form submits to — /search or /category/[slug]
  hiddenFields?: Record<string, string>; // preserved query params not editable by this bar, e.g. q= on the search page
  brands: string[];
  currentValues: {
    minPrice?: string;
    maxPrice?: string;
    inStockOnly?: string;
    sortBy?: string;
    brand?: string;
  };
}

// String literals here, not an imported enum — no shared-types package
// exists between apps/web and apps/api (see
// docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md §2.2), so this list is kept
// in sync manually with apps/api's ProductSortOrder.
const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A-Z' },
];

// A plain GET form, not client-side query-param manipulation — filters
// stay shareable/bookmarkable URLs and work with back/forward navigation
// for free. 'use client' is only needed for the auto-submit-on-change
// behavior on sort/brand/in-stock (price range instead uses an explicit
// Apply button, since auto-submitting on every keystroke would be poor
// UX).
export function ProductFilterBar({ action, hiddenFields, brands, currentValues }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="mb-6 lg:mb-8">
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden flex items-center justify-between mb-4">
        <span className="text-sm text-steel">
          {brands.length > 0 && currentValues.brand && (
            <span className="inline-flex items-center gap-1">
              <span className="bg-black/5 px-2 py-1 rounded-sm text-xs">{currentValues.brand}</span>
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 text-sm text-ink border border-black/20 rounded-sm px-4 py-2 hover:bg-black/5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
        </button>
      </div>

      {/* Desktop Filter Bar */}
      <form
        ref={formRef}
        action={action}
        method="GET"
        className={`${filtersOpen ? 'block' : 'hidden'} lg:block flex flex-wrap items-end gap-3 sm:gap-4 pb-6 border-b border-black/10`}
      >
        {hiddenFields &&
          Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

        {/* Price Range */}
        <div className="flex items-end gap-2">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">Min</label>
            <input
              name="minPrice"
              type="number"
              min={0}
              placeholder="0"
              defaultValue={currentValues.minPrice ?? ''}
              className="w-20 sm:w-24 border border-black/15 rounded-sm px-2 py-1.5 sm:py-2 text-[13px]"
            />
          </div>
          <span className="text-steel pb-2 hidden sm:inline">—</span>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">Max</label>
            <input
              name="maxPrice"
              type="number"
              min={0}
              placeholder="Any"
              defaultValue={currentValues.maxPrice ?? ''}
              className="w-20 sm:w-24 border border-black/15 rounded-sm px-2 py-1.5 sm:py-2 text-[13px]"
            />
          </div>
          <button
            type="submit"
            className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-2 hover:border-hydra hover:text-hydra transition-colors"
          >
            Apply
          </button>
        </div>

        {/* In Stock Checkbox */}
        <label className="flex items-center gap-1.5 text-[13px] pb-2 cursor-pointer">
          <input
            type="checkbox"
            name="inStockOnly"
            value="true"
            defaultChecked={currentValues.inStockOnly === 'true'}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="w-4 h-4 rounded border-black/20 text-hydra focus:ring-hydra"
          />
          <span>In stock only</span>
        </label>

        {/* Brand Filter */}
        {brands.length > 0 && (
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">Brand</label>
            <select
              name="brand"
              defaultValue={currentValues.brand ?? ''}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="border border-black/15 rounded-sm px-2 py-1.5 sm:py-2 text-[13px] min-w-[120px]"
            >
              <option value="">All brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">Sort by</label>
          <select
            name="sortBy"
            defaultValue={currentValues.sortBy ?? 'newest'}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="border border-black/15 rounded-sm px-2 py-1.5 sm:py-2 text-[13px] min-w-[140px]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </form>
    </div>
  );
}
