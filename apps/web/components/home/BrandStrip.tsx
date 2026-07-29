interface Props {
  brands: string[];
}

// Links each brand to /search?brand=X, reusing the existing search
// page's own brand filter (confirmed directly: searchParams.brand is
// already read and passed through by that page) rather than building a
// separate brand-listing page.
export function BrandStrip({ brands }: Props) {
  if (brands.length === 0) return null;

  return (
    <section className="bg-porcelain">
      <div className="max-w-[1240px] mx-auto px-8 py-14">
        <div className="flex justify-between items-baseline mb-7">
          <h2 className="text-2xl font-display font-bold">Shop by Brand</h2>
          <a href="/search" className="font-mono text-[11.5px] uppercase tracking-wide text-hydra">
            All brands →
          </a>
        </div>
        <div className="flex flex-wrap gap-3">
          {brands.map((brand) => (
            <a
              key={brand}
              href={`/search?brand=${encodeURIComponent(brand)}`}
              className="font-mono font-bold text-[13px] text-steel border border-black/10 rounded-sm px-6 py-3 hover:border-hydra hover:text-hydra transition-colors"
            >
              {brand.toUpperCase()}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
