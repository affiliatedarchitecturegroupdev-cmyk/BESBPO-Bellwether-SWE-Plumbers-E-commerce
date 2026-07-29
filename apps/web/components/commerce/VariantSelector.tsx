import Link from 'next/link';

interface Sibling {
  slug: string;
  variantValue: string;
  stockQty: number;
}

interface Props {
  optionLabel: string;
  currentSlug: string;
  siblings: Sibling[];
}

// Deliberately plain navigation between real product pages, not a
// client-side price/stock swap — every sibling is a fully independent
// Product with its own price, stock, images, and reviews, so swapping
// "in place" would mean either a second data fetch anyway or briefly
// showing stale data. A real page transition is simpler and always
// correct; see docs/AGENTS.md's variants section.
export function VariantSelector({ optionLabel, currentSlug, siblings }: Props) {
  if (siblings.length < 2) return null;

  return (
    <div className="mb-5">
      <p className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-2">{optionLabel}</p>
      <div className="flex flex-wrap gap-2">
        {siblings.map((sibling) => {
          const isCurrent = sibling.slug === currentSlug;
          const isOutOfStock = sibling.stockQty === 0;
          return (
            <Link
              key={sibling.slug}
              href={`/product/${sibling.slug}`}
              aria-disabled={isOutOfStock}
              className={`px-3 py-1.5 text-[13px] rounded-sm border ${
                isCurrent
                  ? 'border-hydra bg-[#EAF3F8] font-medium'
                  : isOutOfStock
                    ? 'border-black/10 text-steel line-through'
                    : 'border-black/15 hover:border-hydra'
              }`}
            >
              {sibling.variantValue}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
