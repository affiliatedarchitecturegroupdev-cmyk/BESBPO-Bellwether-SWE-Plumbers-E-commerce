interface BundleSummary {
  slug: string;
  name: string;
  sector: string;
  bundlePrice: string;
  description: string | null;
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

export function BundlesSection({ bundles }: { bundles: BundleSummary[] }) {
  if (bundles.length === 0) return null;

  return (
    <section className="max-w-[1240px] mx-auto px-8 py-14">
      <div className="flex justify-between items-baseline mb-7">
        <h2 className="text-2xl font-display font-bold">Project Bundles</h2>
        <a href="/bundles" className="font-mono text-[11.5px] uppercase tracking-wide text-hydra">
          See all bundles →
        </a>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {bundles.map((bundle) => (
          <a
            key={bundle.slug}
            href={`/bundle/${bundle.slug}`}
            className="block bg-ink-2 text-porcelain rounded-md p-5 hover:opacity-90 transition-opacity"
          >
            <div className="font-mono text-[10px] uppercase tracking-wide text-cyan mb-2.5">{bundle.sector}</div>
            <h3 className="text-base font-semibold mb-2">{bundle.name}</h3>
            {bundle.description && (
              <p className="text-[12px] text-white/60 mb-4 line-clamp-2">{bundle.description}</p>
            )}
            <div className="font-display text-lg font-bold">{zar.format(Number(bundle.bundlePrice))}</div>
          </a>
        ))}
      </div>
    </section>
  );
}
