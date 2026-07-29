'use client';

import { useRef } from 'react';

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

  return (
    <form
      ref={formRef}
      action={action}
      method="GET"
      className="flex flex-wrap items-end gap-4 mb-8 pb-6 border-b border-black/10"
    >
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">Min Price</label>
        <input
          name="minPrice"
          type="number"
          min={0}
          defaultValue={currentValues.minPrice ?? ''}
          className="w-24 border border-black/15 rounded-sm px-2 py-1.5 text-[13px]"
        />
      </div>
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">Max Price</label>
        <input
          name="maxPrice"
          type="number"
          min={0}
          defaultValue={currentValues.maxPrice ?? ''}
          className="w-24 border border-black/15 rounded-sm px-2 py-1.5 text-[13px]"
        />
      </div>
      <button
        type="submit"
        className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-2 hover:border-hydra"
      >
        Apply
      </button>

      <label className="flex items-center gap-1.5 text-[13px] pb-2">
        <input
          type="checkbox"
          name="inStockOnly"
          value="true"
          defaultChecked={currentValues.inStockOnly === 'true'}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        In stock only
      </label>

      {brands.length > 0 && (
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">Brand</label>
          <select
            name="brand"
            defaultValue={currentValues.brand ?? ''}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="border border-black/15 rounded-sm px-2 py-1.5 text-[13px]"
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

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">Sort</label>
        <select
          name="sortBy"
          defaultValue={currentValues.sortBy ?? 'newest'}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="border border-black/15 rounded-sm px-2 py-1.5 text-[13px]"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
